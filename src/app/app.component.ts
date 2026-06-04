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

type FileItem = {
  id: string;
  name: string;
  type: 'txt' | 'log' | 'img' | 'video';
  content?: string;
  assetPath?: string;
  preview?: string;
  restricted?: boolean;
};

type DesktopFolder = {
  id: string;
  name: string;
  hint: string;
  restricted?: boolean;
  files: FileItem[];
};

type WindowState =
  | { type: 'folder'; title: string; folder: DesktopFolder }
  | { type: 'file'; title: string; file: FileItem };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  password = '';
  inputError = false;
  showRestrictedPrompt = false;
  restrictedAccessGranted = false;
  pendingRestrictedFile: FileItem | null = null;
  pendingRestrictedFolder: DesktopFolder | null = null;
  resultVideoViewed = false;
  openingDoor = false;
  doorError = false;
  gateStatus: 'closed' | 'open' = 'closed';

  readonly folders: DesktopFolder[] = [
    {
      id: 'investigacion',
      name: 'Investigacion_X9',
      hint: 'Registros de campo sobre las entidades y su patron de alimentacion.',
      files: [
        {
          id: 'nota-1',
          name: 'bitacora_resonancia.txt',
          type: 'txt',
          content:
            'La camara tres registra una oscilacion en el aire antes de cada manifestacion.\nLas lecturas vuelven a elevarse cuando el personal entra en panico. No parecen responder a la luz ni al calor, solo al miedo.\nEl cubo actua como un extractor: recoge ese miedo, lo condensa y les permite adoptar masa, voz y contorno durante breves periodos.\nHe pedido sellar el ala norte. Cuando las frecuencias bajan, las formas se deshacen como si nunca hubieran estado aqui.',
        },
        {
          id: 'nota-2',
          name: 'incidente_ala_norte.log',
          type: 'log',
          content:
            '[WARN] El personal de vigilancia informa de un zumbido constante dentro de los muros.\n[WARN] Dos tecnicos abandonan su puesto asegurando haber visto siluetas vibrando fuera del espectro visible.\n[ALERT] La entidad no intenta romper la puerta. Espera a que alguien tenga miedo al otro lado.\n[FATAL] La sala de extraccion acumula demasiadas bajas. Demasiados cientificos han muerto intentando medir una materializacion completa.',
        }
      ],
    },
    {
      id: 'clasificado',
      name: 'Registros sensibles',
      hint: 'Evidencias visuales sobre contacto directo con las entidades.',
      files: [
        {
          id: 'correo',
          name: 'informe_confidencial_2.txt',
          type: 'txt',
          content:
            'Quizá pueda obtenerlo y escapar usando su energía en la máquina central.\nLa sala de extraccion ya ha matado a demasiados cientificos, no caed en su trampa.',
        },
        {
          id: 'foto',
          name: 'protocolo_presencia.txt',
          type: 'txt',
          restricted: true,
          content:
            'Hemos podido acceder a la sala de extraccion.\nLa energía de la nave debe correr a través de vosotros.\nRecordar a todos lo mismo: respira, baja la voz, no tengas miedo.',
        },
        {
          id: 'theta-1',
          name: 'xk9_A0-44q.jpeg',
          type: 'img',
          assetPath: 'assets/desktop/Clasificado/WhatsApp Image 2026-05-19 at 10.17.22.jpeg',
          preview: '',
        },
        {
          id: 'theta-3',
          name: 'RZ_3f-0delta.jpeg',
          type: 'img',
          assetPath: 'assets/desktop/Clasificado/WhatsApp Image 2026-05-19 at 10.24.38.jpeg',
          preview: 'Uno de ellos no está... pero no debe haber salido de la nave.',
        },
        {
          id: 'theta-4',
          name: 'zx_7LM-kappa.jpeg',
          type: 'img',
          restricted: true,
          assetPath: 'assets/desktop/Clasificado/WhatsApp Image 2026-05-19 at 10.24.51.jpeg',
          preview: 'Me falta un elemento para completar la fórmula.',
        },
        {
          id: 'theta-5',
          name: 'vanta_88_z.jpeg',
          type: 'img',
          assetPath: 'assets/desktop/Clasificado/WhatsApp Image 2026-05-19 at 11.00.09.jpeg',
          preview: 'Siento una presión en el corazón.',
        },
        {
          id: 'theta-6',
          name: 'q3-psi_null.jpeg',
          type: 'img',
          assetPath: 'assets/desktop/Clasificado/adpsjspodsam.jpeg',
          preview: 'No puedo más.',
        },
        {
          id: 'resultado-video',
          name: 'registro_sala_extraccion.mp4',
          type: 'video',
          restricted: true,
          assetPath: 'assets/result.mp4?v=3',
          preview: 'Registro final de la sala de extraccion. Tras ver el video se abrira la compuerta, tened cuidado.',
        },
      ],
    },
  ];

  activeWindow: WindowState | null = null;
  selectedFolderId: string | null = null;
  currentFolderContext: DesktopFolder | null = null;
  contextMenu = { visible: false, x: 0, y: 0, folderId: null as string | null };
  currentTime = '';

  private readonly correctPassword = 'bacfd';
  private readonly apiUrl = 'http://127.0.0.1:3000/open-door';
  private focusIntervalId: ReturnType<typeof setInterval> | null = null;
  private focusBurstTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private startupFocusRafId: number | null = null;
  private startupFocusEndAt = 0;
  private clockIntervalId: ReturnType<typeof setInterval> | null = null;

  @ViewChild('pwdInput') pwdInput?: ElementRef<HTMLInputElement>;
  @ViewChild('resultVideo') resultVideo?: ElementRef<HTMLVideoElement>;

  constructor(private http: HttpClient) {}

  ngAfterViewInit() {
    this.updateClock();
    this.clockIntervalId = setInterval(() => this.updateClock(), 30000);
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
    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
    }
  }

  get maskedPassword(): string {
    return '*'.repeat(this.password.length);
  }

  get visibleFiles(): FileItem[] {
    const activeFolder =
      this.activeWindow?.type === 'folder' ? this.activeWindow.folder : null;

    if (!activeFolder) {
      return [];
    }

    return activeFolder.files;
  }

  submit() {
    this.inputError = false;

    if (this.password === this.correctPassword) {
      this.password = '';
      this.restrictedAccessGranted = true;
      this.showRestrictedPrompt = false;

      const folderToOpen = this.pendingRestrictedFolder;
      this.pendingRestrictedFolder = null;
      if (folderToOpen) {
        this.openFolderNow(folderToOpen);
        return;
      }

      const fileToOpen = this.pendingRestrictedFile;
      this.pendingRestrictedFile = null;
      if (fileToOpen) {
        this.openFileNow(fileToOpen);
      }
      return;
    }

    this.triggerInputError();
    this.password = '';
    setTimeout(() => this.focusPassword(), 0);
  }

  openFolder(folder: DesktopFolder) {
    if (folder.restricted && !this.restrictedAccessGranted) {
      this.pendingRestrictedFolder = folder;
      this.pendingRestrictedFile = null;
      this.showRestrictedPrompt = true;
      this.scheduleFocusBurst();
      return;
    }

    this.openFolderNow(folder);
  }

  openFolderNow(folder: DesktopFolder) {
    this.currentFolderContext = folder;
    this.selectedFolderId = folder.id;
    this.activeWindow = {
      type: 'folder',
      title: folder.name,
      folder,
    };
    this.closeContextMenu();
  }

  openFile(file: FileItem) {
    if (file.restricted && !this.restrictedAccessGranted) {
      this.pendingRestrictedFile = file;
      this.pendingRestrictedFolder = null;
      this.showRestrictedPrompt = true;
      this.scheduleFocusBurst();
      return;
    }

    this.openFileNow(file);
  }

  closeWindow() {
    if (this.activeWindow?.type === 'file' && this.currentFolderContext) {
      this.activeWindow = {
        type: 'folder',
        title: this.currentFolderContext.name,
        folder: this.currentFolderContext,
      };
      return;
    }

    this.activeWindow = null;
  }

  closeRestrictedPrompt() {
    this.showRestrictedPrompt = false;
    this.pendingRestrictedFile = null;
    this.pendingRestrictedFolder = null;
    this.password = '';
    this.inputError = false;
  }

  reopenSelectedFolder() {
    const folder = this.folders.find((item) => item.id === this.selectedFolderId);
    if (folder) {
      this.openFolder(folder);
    }
    this.closeContextMenu();
  }

  inspectFolderFromMenu() {
    const folder = this.folders.find((item) => item.id === this.contextMenu.folderId);
    if (folder) {
      this.openFolder(folder);
    }
  }

  showFolderContextMenu(event: MouseEvent, folder: DesktopFolder) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedFolderId = folder.id;
    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      folderId: folder.id,
    };
  }

  closeContextMenu() {
    this.contextMenu.visible = false;
  }

  onResultVideoEnded() {
    this.resultVideoViewed = true;
    this.openDoor();
  }

  openDoor() {
    if (!this.resultVideoViewed || this.openingDoor) {
      return;
    }

    this.openingDoor = true;
    this.doorError = false;

    this.http.post(this.apiUrl, {}).subscribe({
      next: () => {
        this.openingDoor = false;
        this.gateStatus = 'open';
        this.resetSession();
      },
      error: () => {
        this.openingDoor = false;
        this.doorError = true;
      },
    });
  }

  resetSession() {
    this.restrictedAccessGranted = false;
    this.selectedFolderId = null;
    this.currentFolderContext = null;
    this.activeWindow = null;
    this.pendingRestrictedFile = null;
    this.pendingRestrictedFolder = null;
    this.password = '';
    this.inputError = false;
    this.showRestrictedPrompt = false;
    this.resultVideoViewed = false;
    this.openingDoor = false;
    this.doorError = false;
    this.closeContextMenu();
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

    if (key === 'Escape') {
      this.closeRestrictedPrompt();
      event.preventDefault();
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
    if (!this.showRestrictedPrompt) {
      return;
    }
    this.scheduleFocusBurst();
  }

  @HostListener('window:focus')
  onWindowFocus() {
    if (this.showRestrictedPrompt) {
      this.scheduleFocusBurst();
    }
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange() {
    if (!document.hidden && this.showRestrictedPrompt) {
      this.scheduleFocusBurst();
    }
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeContextMenu();
  }

  scheduleFocusBurst() {
    if (!this.showRestrictedPrompt) {
      return;
    }

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
    this.startStartupFocusLoop();
    if (this.focusIntervalId) {
      clearInterval(this.focusIntervalId);
    }
    this.focusIntervalId = setInterval(() => this.focusPassword(), 120);
  }

  startStartupFocusLoop() {
    this.startupFocusEndAt = Date.now() + 4000;
    const tick = () => {
      this.focusPassword();
      if (Date.now() < this.startupFocusEndAt && this.showRestrictedPrompt) {
        this.startupFocusRafId = requestAnimationFrame(tick);
      } else {
        this.startupFocusRafId = null;
      }
    };
    tick();
  }

  focusPassword() {
    if (!this.showRestrictedPrompt) {
      return;
    }
    this.pwdInput?.nativeElement.focus({ preventScroll: true });
  }

  trackByFolder(_: number, folder: DesktopFolder) {
    return folder.id;
  }

  trackByFile(_: number, file: FileItem) {
    return file.id;
  }

  isImageFile(file: FileItem): boolean {
    return file.type === 'img' && !!file.assetPath;
  }

  isVideoFile(file: FileItem): boolean {
    return file.type === 'video' && !!file.assetPath;
  }

  private openFileNow(file: FileItem) {
    this.activeWindow = {
      type: 'file',
      title: file.name,
      file,
    };

    if (file.type === 'video') {
      setTimeout(() => {
        const video = this.resultVideo?.nativeElement;
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => undefined);
        }
      }, 0);
    }
  }

  private updateClock() {
    this.currentTime = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  }
}
