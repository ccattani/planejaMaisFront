import { CommonModule } from "@angular/common";
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { Router } from "@angular/router";

import { TransactionService } from "../../../core/service/transaction.service";
import { ServicesService } from "../../../core/service/services.service";
import {
  Transaction,
  TransactionPayload,
} from "../../../shared/models/interfaces/transaction";

type TipoTransacao = "entrada" | "saida";

@Component({
  selector: "app-transacoes",
  standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: "./transacoes.component.html",
  styleUrls: ["./transacoes.component.scss"],
})
export class TransacoesComponent implements OnInit, OnDestroy, OnChanges {
  @Input() transactions: Transaction[] = [];
  @Input() mostrarAcoesEPaginacao = false;

  @Output() add = new EventEmitter<Transaction>();

  mostrarNovaTransacao = false;

  novaTransacaoDescricao = "";
  novaTransacaoCategoria = "";
  novaTransacaoValor = "";
  novaTransacaoTipo: TipoTransacao = "saida";

  indiceGlobalEmEdicao: number | null = null;

  pageSize = 10;
  pageIndex = 0;
  pagedTransactions: Transaction[] = [];

  private inscricaoModal?: Subscription;

  constructor(
    private servicoTransacao: TransactionService,
    private services: ServicesService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.mostrarAcoesEPaginacao = this.router.url?.includes("transactions") ?? false;
    this.inscricaoModal = this.servicoTransacao.open$().subscribe((payload) => {
      if (payload) {
        this.abrirModalEmEdicao(
          payload.desc ?? "",
          payload.value ?? "",
          payload.category ?? "",
          payload.index ?? null
        );
      } else {
        this.abrirModalParaCriacao();
      }
    });

    if (this.mostrarAcoesEPaginacao) {
      this.carregarTodasAsTransacoes();
    }

    this.atualizarTransacoesPaginadas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["transactions"]) {
      this.atualizarTransacoesPaginadas();
      this.changeDetectorRef.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.inscricaoModal?.unsubscribe();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.atualizarTransacoesPaginadas();
  }

  get exibirPaginacao(): boolean {
    return this.mostrarAcoesEPaginacao;
  }

  get exibirAcoes(): boolean {
    return this.mostrarAcoesEPaginacao
  }

  private atualizarTransacoesPaginadas(): void {
    const inicio = this.pageIndex * this.pageSize;
    const fim = inicio + this.pageSize;
    this.pagedTransactions = this.transactions.slice(inicio, fim);
  }

  private obterIndiceGlobal(indiceDaPagina: number): number {
    return this.pageIndex * this.pageSize + indiceDaPagina;
  }

  private converterStringParaNumero(valor: string): number {
    if (!valor) return 0;

    let valorLimpo = valor.replace(/R\$|\s/g, "");
    valorLimpo = valorLimpo.replace(/\./g, "");
    valorLimpo = valorLimpo.replace(/,/g, ".");

    const numero = parseFloat(valorLimpo);
    return isNaN(numero) ? 0 : numero;
  }

  private formatarValorComoMoeda(valor: number): string {
    const valorArredondado = Math.round(valor);
    const sinal = valor < 0 ? "-" : "+";
    return (
      sinal +
      "R$ " +
      new Intl.NumberFormat("pt-BR").format(Math.abs(valorArredondado))
    );
  }

  private limparFormularioTransacao(): void {
    this.novaTransacaoDescricao = "";
    this.novaTransacaoCategoria = "";
    this.novaTransacaoValor = "";
    this.novaTransacaoTipo = "saida";
    this.indiceGlobalEmEdicao = null;
  }

  private abrirModalParaCriacao(): void {
    this.limparFormularioTransacao();
    this.mostrarNovaTransacao = true;
  }

  private abrirModalEmEdicao(
    descricao: string,
    valor: string,
    categoria: string,
    indiceGlobal: number | null
  ): void {
    this.mostrarNovaTransacao = true;
    this.indiceGlobalEmEdicao = indiceGlobal;

    this.novaTransacaoDescricao = descricao ?? "";
    this.novaTransacaoCategoria = categoria ?? "";

    const valorNumerico = this.converterStringParaNumero(valor);
    this.novaTransacaoTipo = valorNumerico < 0 ? "saida" : "entrada";
    this.novaTransacaoValor = String(Math.abs(Math.round(valorNumerico)));
  }

  fecharNovaTransacao(): void {
    this.mostrarNovaTransacao = false;
    this.limparFormularioTransacao();
  }

  alterarTransacao(transacao: Transaction, indiceDaPagina: number): void {
    const indiceGlobal = this.obterIndiceGlobal(indiceDaPagina);
    this.abrirModalEmEdicao(
      transacao.desc,
      transacao.value,
      transacao.category ?? "",
      indiceGlobal
    );
  }

  private montarPayloadTransacao(
    descricao: string,
    valorAssinado: number,
    categoria: string
  ): TransactionPayload {
    const agora = new Date().toISOString();

    return {
      description: descricao,
      value: valorAssinado,
      category: categoria,
      date: agora,
      updatedAt: agora,
    };
  }

  private montarTransacaoParaTela(
    id: string | undefined,
    descricao: string,
    valorAssinado: number,
    categoria: string
  ): Transaction {
    return {
      id,
      desc: descricao,
      value: this.formatarValorComoMoeda(valorAssinado),
      numeric: valorAssinado,
      category: categoria,
    };
  }

  private extrairIdDaResposta(resposta: any): string {
    return String(
      resposta?.id ??
        resposta?._id ??
        resposta?.transactionId ??
        resposta?.data?.id ??
        resposta?.data?._id ??
        ""
    );
  }

  private async carregarTodasAsTransacoes(): Promise<void> {
    try {
      const resposta: any = await this.services.getAllTransactions();
      const lista = Array.isArray(resposta) ? resposta : resposta?.data ?? [];

      this.transactions = (lista as any[]).map((item) => {
        const valor = item.value ?? 0;
        const descricao = item.description ?? item.desc ?? "Transação";
        const id = String(item.id ?? item._id ?? item.transactionId ?? "");

        return this.montarTransacaoParaTela(
          id,
          descricao,
          valor,
          item.category
        );
      });

      this.atualizarTransacoesPaginadas();
      this.changeDetectorRef.detectChanges();
    } catch (erro) {
      console.error("Erro ao buscar transações", erro);
    }
  }

  async adicionarTransacao(): Promise<void> {
    const descricao = this.novaTransacaoDescricao.trim() || "Transação";
    const categoria = this.novaTransacaoCategoria.trim() || descricao;

    const valorNumerico = this.converterStringParaNumero(
      this.novaTransacaoValor
    );
    if (valorNumerico <= 0) {
      this.fecharNovaTransacao();
      return;
    }

    const valorAssinado =
      this.novaTransacaoTipo === "saida" ? -valorNumerico : valorNumerico;
    const payload = this.montarPayloadTransacao(
      descricao,
      valorAssinado,
      categoria
    );

    // EDIÇÃO
    if (this.indiceGlobalEmEdicao !== null) {
      const transacaoAtual = this.transactions[this.indiceGlobalEmEdicao];

      if (!transacaoAtual?.id) {
        console.error("Não foi possível atualizar: transação sem id.");
        return;
      }

      try {
        await this.services.updateExpense(transacaoAtual.id, payload);
      } catch (erro) {
        console.error("Erro ao atualizar lançamento (API):", erro);
        return;
      }

      const transacaoAtualizada = this.montarTransacaoParaTela(
        transacaoAtual.id,
        descricao,
        valorAssinado,
        categoria
      );

      const copia = [...this.transactions];
      copia[this.indiceGlobalEmEdicao] = transacaoAtualizada;
      this.transactions = copia;

      this.atualizarTransacoesPaginadas();
      this.fecharNovaTransacao();
      return;
    }

    // CRIAÇÃO
    let respostaCriacao: any;

    try {
      respostaCriacao = await this.services.createExpense(payload);
    } catch (erro) {
      console.error("Erro ao criar lançamento (API):", erro);
      return;
    }

    const idCriado = this.extrairIdDaResposta(respostaCriacao);

    if (!idCriado) {
      console.warn(
        "A API criou a transação, mas não retornou id. Editar e excluir podem falhar até recarregar."
      );
    }

    const transacaoNova = this.montarTransacaoParaTela(
      idCriado || undefined,
      descricao,
      valorAssinado,
      categoria
    );

    this.add.emit(transacaoNova);

    this.transactions = [transacaoNova, ...this.transactions];
    this.atualizarTransacoesPaginadas();

    this.fecharNovaTransacao();
  }

  async deletarTransacao(
    transacao: Transaction,
    indiceDaPagina: number
  ): Promise<void> {
    if (!transacao.id) {
      console.error("Sem id: não dá para excluir com segurança.");
      return;
    }

    const indiceGlobal = this.obterIndiceGlobal(indiceDaPagina);

    const backup = [...this.transactions];

    this.transactions = this.transactions.filter(
      (_, index) => index !== indiceGlobal
    );
    this.atualizarTransacoesPaginadas();

    try {
      await this.services.deleteExpense(transacao.id);
    } catch (erro) {
      console.error("Erro ao excluir (API):", erro);
      this.transactions = backup;
      this.atualizarTransacoesPaginadas();
    }
  }
}
