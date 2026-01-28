import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../auth.service';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

// Client-side validation - comprehensive profanity list
const profanityList = [
  // F-word variants
  'fuck', 'fuk', 'fck', 'fuc', 'fuq', 'f u c k', 'fvck', 'phuck', 'phuk', 'fux', 'fuk', 'fcuk',
  // S-word variants
  'shit', 'sht', 'shyt', 'sh1t', 's h i t', 'shiz', 'shiт',
  // A-word variants
  'ass', 'azz', 'a55', 'a s s', 'arse', 'assh0le', 'asshole', 'arsehole',
  // B-word variants
  'bitch', 'btch', 'b1tch', 'biatch', 'b i t c h', 'bytch',
  // C-word variants
  'cunt', 'cnt', 'c u n t', 'cvnt',
  // D-word variants
  'dick', 'd1ck', 'dik', 'd i c k', 'dck', 'dikk',
  'damn', 'dmn', 'd4mn',
  // Cock variants
  'cock', 'cok', 'c0ck', 'c o c k', 'kok', 'cawk',
  // P-word variants
  'pussy', 'puss', 'psy', 'pu55y', 'p u s s y', 'pussie', 'pusy',
  'penis', 'pnis', 'pen1s', 'p e n i s', 'penus',
  'porn', 'prn', 'p0rn', 'pron', 'pr0n',
  'piss', 'pss', 'p1ss',
  // Slurs
  'fag', 'faggot', 'f4g', 'fagg0t', 'f4gg0t', 'fagt', 'fagit',
  'gay', 'g4y', 'gey', 'gae', 'ghey', 'ghay',
  'nigger', 'nigga', 'n1gger', 'n1gga', 'niga', 'nigg', 'n i g g', 'niggr', 'nigr', 'nig',
  'retard', 'retrd', 'r3tard', 'ret4rd', 'retart',
  'dyke', 'dyk3', 'd y k e',
  'tranny', 'tr4nny',
  'spic', 'sp1c', 'spick',
  'chink', 'ch1nk',
  'kike', 'k1ke',
  'wetback', 'w3tback',
  'beaner', 'b3aner',
  'cracker', 'cr4cker',
  'honky', 'honkey', 'h0nky',
  'gook', 'g00k',
  'jap', 'j4p',
  // Sexist terms
  'slut', 'sl0t', 's l u t', 'slutt', 'sluut',
  'whore', 'wh0re', 'h0e', 'hoe', 'w h o r e', 'hoar',
  'skank', 'sk4nk',
  'thot', 'th0t',
  // Other profanity
  'bastard', 'bstrd', 'b4stard',
  'crap', 'cr4p',
  'twat', 'tw4t',
  'wanker', 'wnkr', 'w4nker', 'wanka',
  'douche', 'd0uche', 'douchebag',
  'jackass', 'j4ckass',
  'motherfucker', 'mf', 'mofo', 'm0fo', 'motherf',
  'stfu', 'gtfo', 'kys', 'k y s',
  // Body parts / sexual
  'nude', 'nudes', 'nud3',
  'sex', 'sexx', 's3x', 'seks',
  'vagina', 'vag', 'vaj', 'vag1na',
  'boob', 'tit', 'titty', 'b00b', 't1t', 'titt', 'boobs', 'tits', 'titties',
  'cum', 'jizz', 'j1zz', 'cumm', 'cuming', 'cumming',
  'anal', 'anus', 'an4l', 'anuss',
  'dildo', 'd1ldo', 'dild0',
  'vibrator',
  'erection', 'erect', 'boner', 'b0ner',
  'orgasm', '0rgasm',
  'masturbat', 'masturb', 'fap', 'f4p', 'jerk off', 'jerkoff',
  'blowjob', 'bl0wjob', 'bj',
  'handjob', 'h4ndjob', 'hj',
  // Violence / harmful
  'rape', 'rapist', 'r4pe', 'rap3', 'r a p e', 'raping',
  'molest', 'm0lest', 'molester',
  'pedo', 'pedophile', 'ped0', 'paedo',
  'kill', 'k1ll', 'murder',
  'suicide', 'suicid',
  // Drugs
  'cocaine', 'c0caine', 'coke',
  'heroin', 'her0in',
  'meth', 'm3th',
  'weed', 'w33d',
  'marijuana', 'mar1juana',
];

const religiousTermsList = [
  'god', 'g0d', 'jesus', 'jsus', 'christ', 'chrst', 'allah', 'muhammad',
  'mohammed', 'mohamed', 'buddha', 'satan', 'lucifer', 'devil', 'dvil',
  'hell', 'h3ll', 'heaven', 'hven', 'bible', 'bibl', 'quran', 'koran',
  'torah', 'church', 'mosque', 'temple', 'holy', 'angel', 'demon',
  'prayer', 'pray', 'gospel', 'prophet', 'messiah', 'psalm', 'apostle',
  'jihad', 'christian', 'muslim', 'jewish', 'hindu', 'buddhist',
  'atheist', 'agnostic', 'cult', 'sect', 'heretic', 'blasphemy', 'sinner', 'sin'
];

@Component({
  selector: 'app-username-selection',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="auth-page">
      <canvas #particleCanvas class="particle-canvas"></canvas>

      <div class="auth-container">
        <div class="auth-card">
          <div class="logo-section">
            <div class="logo discord">
              <mat-icon>discord</mat-icon>
            </div>
            <h1>Welcome!</h1>
            <p class="tagline">Choose your username to continue</p>
          </div>

          <form [formGroup]="usernameForm" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-field">
              <mat-icon class="field-icon">person</mat-icon>
              <input
                type="text"
                formControlName="username"
                placeholder="Enter your username"
                maxlength="15"
                autocomplete="username" />
              <span class="char-count">{{ usernameForm.get('username')?.value?.length || 0 }}/15</span>
            </div>

            @if (usernameForm.get('username')?.touched && usernameForm.get('username')?.hasError('required')) {
              <span class="error-text">Username is required</span>
            }
            @if (usernameForm.get('username')?.touched && usernameForm.get('username')?.hasError('minlength')) {
              <span class="error-text">Username must be at least 2 characters</span>
            }
            @if (usernameForm.get('username')?.touched && usernameForm.get('username')?.hasError('maxlength')) {
              <span class="error-text">Username must be 15 characters or less</span>
            }
            @if (usernameForm.get('username')?.touched && usernameForm.get('username')?.hasError('pattern')) {
              <span class="error-text">Only letters, numbers, underscores, and spaces allowed</span>
            }
            @if (usernameForm.get('username')?.hasError('consecutiveSpaces')) {
              <span class="error-text">No consecutive spaces allowed</span>
            }
            @if (usernameForm.get('username')?.hasError('profanity')) {
              <span class="error-text">No</span>
            }
            @if (usernameForm.get('username')?.hasError('religious')) {
              <span class="error-text">You're too ass for this name</span>
            }

            <button type="submit" class="submit-btn" [disabled]="loading || usernameForm.invalid">
              @if (loading) {
                <mat-spinner diameter="24"></mat-spinner>
              } @else {
                <span>Continue</span>
                <mat-icon>arrow_forward</mat-icon>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      background: #121212;
      position: relative;
      overflow: hidden;
    }

    .particle-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .auth-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      position: relative;
      z-index: 1;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: #1e1e1e;
      border-radius: 16px;
      border: 1px solid #2d2d2d;
      padding: 40px 32px;
    }

    .logo-section {
      text-align: center;
      margin-bottom: 32px;

      .logo {
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        background: var(--theme-primary-bright, #64b5f6);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;

        &.discord {
          background: #5865F2;
        }

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: white;
        }
      }

      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: white;
      }

      .tagline {
        margin: 8px 0 0;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
      }
    }

    .auth-form {
      h2 {
        margin: 0 0 24px;
        color: white;
        font-size: 20px;
        font-weight: 600;
        text-align: center;
      }
    }

    .form-field {
      position: relative;
      margin-bottom: 16px;

      .field-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.4);
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      input {
        width: 100%;
        padding: 14px 60px 14px 44px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid #2d2d2d;
        border-radius: 8px;
        color: white;
        font-size: 15px;
        transition: all 0.2s ease;
        box-sizing: border-box;

        &::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        &:focus {
          outline: none;
          border-color: #5865F2;
          background: rgba(88, 101, 242, 0.05);
        }
      }

      .char-count {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
      }
    }

    .error-text {
      display: block;
      color: #ef5350;
      font-size: 12px;
      margin-top: -8px;
      margin-bottom: 12px;
      padding-left: 14px;
    }

    .submit-btn {
      width: 100%;
      padding: 14px 24px;
      background: #5865F2;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #4752c4;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      mat-spinner {
        ::ng-deep circle {
          stroke: white;
        }
      }
    }
  `]
})
export class UsernameSelectionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  usernameForm: FormGroup;
  loading = false;

  private ctx!: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId!: number;
  private readonly particleCount = 80;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.usernameForm = this.fb.group({
      username: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(15),
        Validators.pattern(/^[a-zA-Z0-9_ ]+$/),
        this.consecutiveSpacesValidator.bind(this),
        this.profanityValidator.bind(this),
        this.religiousValidator.bind(this)
      ]]
    });
  }

  ngOnInit(): void {
    // Check if user is authenticated and needs username
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/leaderboards']);
      return;
    }

    if (!this.authService.needsUsername()) {
      this.router.navigate(['/']);
      return;
    }

    // Autofill with Discord username if available
    const suggested = this.authService.suggestedUsername();
    if (suggested) {
      // Clean the Discord username to only valid characters, collapse multiple spaces
      const cleaned = suggested
        .replace(/[^a-zA-Z0-9_ ]/g, '')
        .replace(/  +/g, ' ')
        .trim()
        .slice(0, 15);
      if (cleaned.length >= 2) {
        this.usernameForm.patchValue({ username: cleaned });
      }
    }
  }

  ngAfterViewInit(): void {
    this.initParticles();
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private consecutiveSpacesValidator(control: any) {
    if (!control.value) return null;
    return /  /.test(control.value) ? { consecutiveSpaces: true } : null;
  }

  private profanityValidator(control: any) {
    if (!control.value) return null;
    const value = control.value.toLowerCase();
    const noSpaces = value.replace(/ /g, '');

    // Check each word in the username separately (split by space/underscore)
    const words = value.split(/[\s_]+/);

    const hasProfanity = profanityList.some((badWord: string) => {
      // Check if any individual word matches exactly
      if (words.some((w: string) => w === badWord)) return true;
      // Check if the whole username without spaces IS the bad word (catches "f u c k")
      if (noSpaces === badWord) return true;
      return false;
    });

    return hasProfanity ? { profanity: true } : null;
  }

  private religiousValidator(control: any) {
    if (!control.value) return null;
    const value = control.value.toLowerCase();
    const noSpaces = value.replace(/ /g, '');

    // Check each word in the username separately (split by space/underscore)
    const words = value.split(/[\s_]+/);

    const hasReligious = religiousTermsList.some((badWord: string) => {
      // Check if any individual word matches exactly
      if (words.some((w: string) => w === badWord)) return true;
      // Check if the whole username without spaces IS the bad word (catches "g o d")
      if (noSpaces === badWord) return true;
      return false;
    });

    return hasReligious ? { religious: true } : null;
  }

  private initParticles(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle());
    }

    this.animate();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private createParticle(): Particle {
    const canvas = this.canvasRef.nativeElement;
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.3 + 0.1
    };
  }

  private animate(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.particles.forEach((particle, i) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 0) particle.x = canvas.width;
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.y < 0) particle.y = canvas.height;
      if (particle.y > canvas.height) particle.y = 0;

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(88, 101, 242, ${particle.opacity})`;
      this.ctx.fill();

      this.particles.slice(i + 1).forEach(other => {
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.moveTo(particle.x, particle.y);
          this.ctx.lineTo(other.x, other.y);
          this.ctx.strokeStyle = `rgba(88, 101, 242, ${0.1 * (1 - distance / 100)})`;
          this.ctx.stroke();
        }
      });
    });

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  onSubmit(): void {
    if (this.usernameForm.valid) {
      this.loading = true;
      this.authService.setUsername(this.usernameForm.value.username).subscribe({
        next: () => {
          this.snackBar.open('Username set successfully!', 'Close', { duration: 3000 });
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(
            error.error?.message || 'Failed to set username. Please try again.',
            'Close',
            { duration: 3000 }
          );
        }
      });
    }
  }
}
