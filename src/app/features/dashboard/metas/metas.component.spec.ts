/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { MetasComponent } from './metas.component';

describe('MetasComponent', () => {
  let component: MetasComponent;
  let fixture: ComponentFixture<MetasComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MetasComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MetasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
