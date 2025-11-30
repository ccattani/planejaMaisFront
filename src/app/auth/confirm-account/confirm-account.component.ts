import { Component } from '@angular/core';
import { AuthCardComponent } from "../components/auth-card/auth-card.component";
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-confirm-accoun',
  standalone: true,
  imports: [AuthCardComponent, RouterModule],
  templateUrl: './confirm-account.component.html',
  styleUrl: './confirm-account.component.scss'
})
export class ConfirmAccountComponent {

}
