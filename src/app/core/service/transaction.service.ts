import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private openSubject = new Subject<void>();

  open$(): Observable<void> {
    return this.openSubject.asObservable();
  }

  open() {
    this.openSubject.next();
  }
}
