/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TxModalComponent } from './tx-modal.component';

describe('TxModalComponent', () => {
  let component: TxModalComponent;
  let fixture: ComponentFixture<TxModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TxModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TxModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
