import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
} from '@angular/core';
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
export class AppComponent implements AfterViewInit, OnDestroy {
  state: ScreenState = 'LOCK';

  password = '';
  inputError = false;

  private readonly correctPassword = 'bcdaf';
  private readonly apiUrl = 'http://127.0.0.1:3000/open-door';
  private focusIntervalId: ReturnType<typeof setInterval> | null = null;
  private focusBurstTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private startupFocusRafId: number | null = null;
  private startupFocusEndAt = 0;

  @ViewChild('pwdInput') pwdInput?: ElementRef<HTMLInputElement>;
  @ViewChild('successVideo') successVideo?: ElementRef<HTMLVideoElement>;

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    // Kiosk-safe focus keeper: keeps trying even if startup/render is slow.
    this.scheduleFocusBurst();
    this.startStartupFocusLoop();
    this.focusIntervalId = setInterval(() => this.focusPassword(), 120);
  }

  ngOnDestroy() {
    if (this.focusIntervalId) {
      clearInterval(this.focusIntervalId);
    }
    if (this.focusBurstTimeoutId) {
      clearTimeout(this.focusBurstTimeoutId);
    }
    if (this.startupFocusRafId !== null) {
      cancelAnimationFrame(this.startupFocusRafId);
    }
  }

  get maskedPassword(): string {
    return '*'.repeat(this.password.length);
  }

  submit() {
    this.inputError = false;

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
      this.triggerInputError();
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
    this.inputError = false;
    this.scheduleFocusBurst();
  }

  triggerInputError() {
    this.inputError = false;
    setTimeout(() => {
      this.inputError = true;
      setTimeout(() => (this.inputError = false), 450);
    }, 0);
  }

  onPasswordKeydown(event: KeyboardEvent) {
    const { key, ctrlKey, metaKey, altKey } = event;

    if (key === 'Enter' || key === 'Tab') {
      return;
    }

    if (key === 'Backspace') {
      this.password = this.password.slice(0, -1);
      event.preventDefault();
      return;
    }

    if (key === 'Delete') {
      this.password = '';
      event.preventDefault();
      return;
    }

    if (ctrlKey || metaKey || altKey) {
      event.preventDefault();
      return;
    }

    if (key.length === 1) {
      this.password += key;
      event.preventDefault();
      return;
    }

    event.preventDefault();
  }

  onPasswordPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') ?? '';
    if (!pastedText) {
      return;
    }
    this.password += pastedText;
  }

  onPasswordBlur() {
    if (this.state !== 'LOCK') {
      return;
    }
    this.scheduleFocusBurst();
  }

  @HostListener('window:focus')
  onWindowFocus() {
    this.scheduleFocusBurst();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden) {
      this.scheduleFocusBurst();
    }
  }

  scheduleFocusBurst() {
    this.focusPassword();
    setTimeout(() => this.focusPassword(), 0);
    setTimeout(() => this.focusPassword(), 50);
    setTimeout(() => this.focusPassword(), 120);
    setTimeout(() => this.focusPassword(), 220);
    setTimeout(() => this.focusPassword(), 350);
    if (this.focusBurstTimeoutId) {
      clearTimeout(this.focusBurstTimeoutId);
    }
    this.focusBurstTimeoutId = setTimeout(() => {
      this.focusBurstTimeoutId = null;
    }, 500);
  }

  startStartupFocusLoop() {
    this.startupFocusEndAt = Date.now() + 6000;
    const tick = () => {
      this.focusPassword();
      if (Date.now() < this.startupFocusEndAt) {
        this.startupFocusRafId = requestAnimationFrame(tick);
      } else {
        this.startupFocusRafId = null;
      }
    };
    tick();
  }

  focusPassword() {
    if (this.state !== 'LOCK') {
      return;
    }
    this.pwdInput?.nativeElement.focus({ preventScroll: true });
  }
}
