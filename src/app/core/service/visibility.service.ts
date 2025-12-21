import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VisibilityService {
  private _showBalances = new BehaviorSubject<boolean>(true);
  showBalances$ = this._showBalances.asObservable();

  toggle() {
    this._showBalances.next(!this._showBalances.value);
  }

  set(value: boolean) {
    this._showBalances.next(value);
  }

  get value() {
    return this._showBalances.value;
  }
}
