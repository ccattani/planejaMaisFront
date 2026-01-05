import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface TransactionOpenPayload {
  desc?: string;
  value?: string;
  index?: number;
  category?: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private openSubject = new Subject<TransactionOpenPayload | void>();

  open$(): Observable<TransactionOpenPayload | void> {
    return this.openSubject.asObservable();
  }

  open(payload?: TransactionOpenPayload) {
    this.openSubject.next(payload);
  }
}
