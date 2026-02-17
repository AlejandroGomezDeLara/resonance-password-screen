import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

type ScreenState = 'LOCK' | 'SUCCESS';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  state: ScreenState = 'LOCK';

  password = '';
  error = '';

  private readonly correctPassword = 'bcdaf';
  private readonly apiUrl = 'http://127.0.0.1:3000/open-door';

  @ViewChild('pwdInput') pwdInput?: ElementRef<HTMLInputElement>;
  @ViewChild('successVideo') successVideo?: ElementRef<HTMLVideoElement>;

  constructor(private http: HttpClient) {}

  submit() {
    this.error = '';

    if (this.password === this.correctPassword) {
      this.password = '';
      this.state = 'SUCCESS';

      // Espera a que Angular pinte el video y lánzalo
      setTimeout(() => {
        const vid = this.successVideo?.nativeElement;
        if (vid) {
          vid.currentTime = 0;
          vid.play().catch(() => {
            // Si el navegador bloquea autoplay con sonido, asegúrate que el video no tenga audio
            // o ponlo muted.
          });
        }
      }, 0);
    } else {
      this.error = 'Incorrect password';
      this.password = '';
      setTimeout(() => this.focusPassword(), 0);
    }
  }

  onSuccessVideoEnded() {
    // Cuando termina el vídeo, llama a la API y vuelve al lock
    this.http.post(this.apiUrl, {}).subscribe({
      next: () => this.resetToLock(),
      error: () => this.resetToLock(), // aunque falle, vuelve a lock
    });
  }

  resetToLock() {
    this.state = 'LOCK';
    this.error = '';
    setTimeout(() => this.focusPassword(), 0);
  }

  focusPassword() {
    this.pwdInput?.nativeElement.focus();
  }
}
