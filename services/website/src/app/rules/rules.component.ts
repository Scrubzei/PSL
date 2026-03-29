import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="page-wrapper">
      <div class="rules-container">
        <h1>1v1 Rules</h1>

        <div class="game-tabs">
          <button
            class="game-tab"
            [class.active]="activeGame === 'bo2'"
            (click)="setGame('bo2')">
            Black Ops 2
          </button>
          <button
            class="game-tab"
            [class.active]="activeGame === 'mw2'"
            (click)="setGame('mw2')">
            Modern Warfare 2
          </button>
          <button
            class="game-tab"
            [class.active]="activeGame === 'mw2019'"
            (click)="setGame('mw2019')">
            MW 2019
          </button>
        </div>

        <!-- BO2 Rules -->
        @if (activeGame === 'bo2') {
          <section>
            <h2>Free For All Settings</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Time Limit</span><span class="setting-value">Unlimited</span></div>
              <div class="setting"><span class="setting-label">Score Limit</span><span class="setting-value">20 Points</span></div>
              <div class="setting"><span class="setting-label">Hardcore</span><span class="setting-value">Off</span></div>
            </div>
            <p class="note">*Spawntrapping on Nuketown has a score limit of 50 points</p>
          </section>

          <section>
            <h2>Health & Damage</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Health</span><span class="setting-value">30%</span></div>
              <div class="setting"><span class="setting-label">Health Regeneration</span><span class="setting-value">Normal</span></div>
              <div class="setting"><span class="setting-label">Headshots Only</span><span class="setting-value">No</span></div>
              <div class="setting"><span class="setting-label">Hit Indicator</span><span class="setting-value">On</span></div>
            </div>
          </section>

          <section>
            <h2>General Settings</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Scorestreaks</span><span class="setting-value">Not Allowed</span></div>
              <div class="setting"><span class="setting-label">Pre-Match Timer</span><span class="setting-value">15 Seconds</span></div>
              <div class="setting"><span class="setting-label">Pre-Round Timer</span><span class="setting-value">5 Seconds</span></div>
              <div class="setting"><span class="setting-label">Auto Team Balance</span><span class="setting-value">Off</span></div>
              <div class="setting"><span class="setting-label">Team Change In-Game</span><span class="setting-value">Allowed</span></div>
              <div class="setting"><span class="setting-label">Dynamic Map Elements</span><span class="setting-value">Yes</span></div>
              <div class="setting"><span class="setting-label">Killcam</span><span class="setting-value">Disabled (Enabled if non-spawntrapping)</span></div>
              <div class="setting"><span class="setting-label">3rd Person Spectating</span><span class="setting-value">Allowed</span></div>
              <div class="setting"><span class="setting-label">CODcasting</span><span class="setting-value">Allowed</span></div>
              <div class="setting"><span class="setting-label">Minimap</span><span class="setting-value">Constant</span></div>
              <div class="setting"><span class="setting-label">Scorestreak Delay</span><span class="setting-value">Off</span></div>
            </div>
          </section>

          <section>
            <h2>Warnings</h2>
            <p class="section-desc">The following will result in a warning. Two warnings will result in a disqualification.</p>
            <ul>
              <li>Incorrect rules and setup</li>
              <li>Illegal class setup</li>
              <li>Spawning out and spawning back in / killing yourself with ammo</li>
              <li>Using or throwing equipment that corrupts the game (e.g. throwing a C4 into a spawn to prevent a player from spawning there)</li>
              <li>Reload cancelling (unless you're in a spawntrap)</li>
              <li>Stalling the match by avoiding all engagements (Ring/Rose)</li>
              <li>Lean (unless you're spawntrapping)</li>
              <li>Fast spawning</li>
            </ul>
          </section>

          <section>
            <h2>Disqualifications</h2>
            <p class="section-desc">The following will result in a disqualification:</p>
            <ul>
              <li>Glitch snaking</li>
              <li>Killing with an illegal setup, rules, or class</li>
              <li>Killing a player not participating in the match</li>
              <li>Hardscoping, hardscope jumpshots, relapse shots</li>
              <li>Killing a player with explosive objects on the map (barrels, cars, tanks) is legal, but only if the explosion was caused by a sniper</li>
              <li>Any form of cheating that gives you an unfair advantage — hacking/mods, IP flooding/DDoS, manipulating in-game mechanics/glitching, or assistance from a non-competing player</li>
              <li>Refusing a PC check or screen share request from a ref</li>
            </ul>
          </section>
        }

        <!-- MW2 Rules -->
        @if (activeGame === 'mw2') {
          <section>
            <h2>Class Setup</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Perk 1</span><span class="setting-value">Sleight of Hand / Sleight of Hand Pro</span></div>
              <div class="setting"><span class="setting-label">Perk 2</span><span class="setting-value">Stopping Power / Stopping Power Pro</span></div>
              <div class="setting"><span class="setting-label">Perk 3</span><span class="setting-value">Ninja / Ninja Pro</span></div>
              <div class="setting"><span class="setting-label">Attachment</span><span class="setting-value">FMJ</span></div>
              <div class="setting"><span class="setting-label">Deathstreak</span><span class="setting-value">Copycat</span></div>
            </div>
          </section>

          <section>
            <h2>Free For All Settings</h2>
          </section>

          <section>
            <h2>Game Rules</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Time Limit</span><span class="setting-value">Unlimited</span></div>
              <div class="setting"><span class="setting-label">Score Limit</span><span class="setting-value">1000 Points (20 Kills)</span></div>
              <div class="setting"><span class="setting-label">Hardcore</span><span class="setting-value">Off</span></div>
            </div>
          </section>

          <section>
            <h2>Player Options</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Number of Lives</span><span class="setting-value">Unlimited</span></div>
              <div class="setting"><span class="setting-label">Respawn Delay</span><span class="setting-value">None</span></div>
              <div class="setting"><span class="setting-label">Max Health</span><span class="setting-value">Minuscule</span></div>
              <div class="setting"><span class="setting-label">Health Regeneration</span><span class="setting-value">Normal</span></div>
              <div class="setting"><span class="setting-label">Killcam</span><span class="setting-value">Disabled</span></div>
            </div>
          </section>

          <section>
            <h2>Team Options</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Spectating</span><span class="setting-value">Player Only</span></div>
              <div class="setting"><span class="setting-label">Wave Spawn Delay</span><span class="setting-value">None</span></div>
              <div class="setting"><span class="setting-label">Force Respawn</span><span class="setting-value">Enabled</span></div>
              <div class="setting"><span class="setting-label">Radar Always On</span><span class="setting-value">Yes</span></div>
            </div>
          </section>

          <section>
            <h2>Gameplay Options</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Headshot Only</span><span class="setting-value">Disabled</span></div>
              <div class="setting"><span class="setting-label">Perks</span><span class="setting-value">Enabled</span></div>
              <div class="setting"><span class="setting-label">Killstreak Rewards</span><span class="setting-value">Disabled</span></div>
              <div class="setting"><span class="setting-label">3rd Person</span><span class="setting-value">Disabled</span></div>
            </div>
          </section>

          <section>
            <h2>Warnings</h2>
            <p class="section-desc">The following will result in a warning. Two warnings will result in a disqualification.</p>
            <ul>
              <li>Incorrect rules and setup</li>
              <li>Illegal class setup</li>
              <li>Spawning out and spawning back in / killing yourself with ammo</li>
              <li>Using or throwing equipment that corrupts the game (e.g. throwing a knife into a spawn to prevent a player from spawning there)</li>
            </ul>
          </section>

          <section>
            <h2>Disqualifications</h2>
            <p class="section-desc">The following will result in a disqualification:</p>
            <ul>
              <li>Killing with an illegal setup, rules, or class</li>
              <li>Killing a player not participating in the match</li>
              <li>Point glitching — can result in DQ or a free kill for the victim player depending on their call</li>
              <li>Throwing knives</li>
              <li>Hardscoping, relapse shots (exception: jump shots over nearby objects obstructing your view are allowed — you may scope in before jumping, but it cannot be a hardscope)</li>
              <li>Killing a player with explosive objects on the map (barrels, cars, tanks) is legal, but only if the explosion was caused by a sniper</li>
              <li>Any form of cheating that gives you an unfair advantage — hacking/mods, IP flooding/DDoS, manipulating in-game mechanics/glitching, counting bullets, or assistance from a non-competing player</li>
            </ul>
          </section>
        }

        <!-- MW 2019 Rules -->
        @if (activeGame === 'mw2019') {
          <section>
            <h2>Class Setup</h2>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Weapon</span><span class="setting-value">Kar98k</span></div>
              <div class="setting"><span class="setting-label">Muzzle</span><span class="setting-value">None</span></div>
              <div class="setting"><span class="setting-label">Barrel</span><span class="setting-value">None</span></div>
              <div class="setting"><span class="setting-label">Laser</span><span class="setting-value">Tac Laser</span></div>
              <div class="setting"><span class="setting-label">Optic</span><span class="setting-value">Sniper Scope (default reticle)</span></div>
              <div class="setting"><span class="setting-label">Stock</span><span class="setting-value">FTAC Sport Comb</span></div>
              <div class="setting"><span class="setting-label">Underbarrel</span><span class="setting-value">None</span></div>
              <div class="setting"><span class="setting-label">Rear Grip</span><span class="setting-value">Stippled Grip Tape</span></div>
              <div class="setting"><span class="setting-label">Perk</span><span class="setting-value">FMJ or Sleight of Hand</span></div>
              <div class="setting"><span class="setting-label">Perk 1</span><span class="setting-value">Double Time or Scavenger</span></div>
              <div class="setting"><span class="setting-label">Perk 2</span><span class="setting-value">Restock</span></div>
              <div class="setting"><span class="setting-label">Perk 3</span><span class="setting-value">Amped</span></div>
            </div>
          </section>

          <section>
            <h2>Free For All Rules</h2>

            <h3>Game</h3>
            <div class="settings-grid">
              <div class="setting changed"><span class="setting-label">Time Limit</span><span class="setting-value">Unlimited</span></div>
              <div class="setting changed"><span class="setting-label">Score Limit</span><span class="setting-value">20 Points</span></div>
              <div class="setting"><span class="setting-label">Match Start Time</span><span class="setting-value">15 Seconds</span></div>
              <div class="setting"><span class="setting-label">Skip Infil</span><span class="setting-value">Disabled</span></div>
              <div class="setting"><span class="setting-label">Input Swap Allowed</span><span class="setting-value">Enabled</span></div>
              <div class="setting"><span class="setting-label">CDL Tuning</span><span class="setting-value">Disabled</span></div>
              <div class="setting"><span class="setting-label">CODcaster</span><span class="setting-value">Disabled</span></div>
            </div>

            <h3>Advanced</h3>
            <div class="settings-grid">
            </div>

            <h3>Player</h3>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Number of Lives</span><span class="setting-value">Unlimited</span></div>
              <div class="setting changed"><span class="setting-label">Max Health</span><span class="setting-value">1</span></div>
              <div class="setting"><span class="setting-label">Health Regeneration</span><span class="setting-value">Normal</span></div>
              <div class="setting"><span class="setting-label">Tactical Sprint</span><span class="setting-value">Enabled</span></div>
              <div class="setting"><span class="setting-label">Weapon Mounting</span><span class="setting-value">Enabled</span></div>
            </div>

            <h3>Team</h3>
            <div class="settings-grid">
              <div class="setting"><span class="setting-label">Spectating</span><span class="setting-value">Team Only</span></div>
              <div class="setting"><span class="setting-label">3rd Person Spectating</span><span class="setting-value">Enabled</span></div>
              <div class="setting changed"><span class="setting-label">Killcam</span><span class="setting-value">Disabled</span></div>
              <div class="setting"><span class="setting-label">Final Killcam</span><span class="setting-value">PotG</span></div>
              <div class="setting"><span class="setting-label">Enable Minimap</span><span class="setting-value">Yes</span></div>
              <div class="setting changed"><span class="setting-label">Radar Always On</span><span class="setting-value">Constant</span></div>
              <div class="setting"><span class="setting-label">Weapon Pings on Minimap</span><span class="setting-value">Only When UAV Active</span></div>
              <div class="setting"><span class="setting-label">Weapon Pings on Compass</span><span class="setting-value">Enabled</span></div>
              <div class="setting changed"><span class="setting-label">Enemy on Compass</span><span class="setting-value">Disabled</span></div>
              <div class="setting changed"><span class="setting-label">Respawn Delay</span><span class="setting-value">0.5 Seconds</span></div>
              <div class="setting"><span class="setting-label">Wave Spawn Delay</span><span class="setting-value">None</span></div>
              <div class="setting"><span class="setting-label">Suicide Spawn Delay</span><span class="setting-value">None</span></div>
            </div>

          </section>

          <section>
            <h2>Warnings</h2>
            <p class="section-desc">The following will result in a warning. Two warnings will result in a disqualification.</p>
            <ul>
              <li>Incorrect rules and setup</li>
              <li>Illegal class setup</li>
              <li>Spawning out and spawning back in / killing yourself with ammo</li>
              <li>Using or throwing equipment that corrupts the game</li>
            </ul>
          </section>

          <section>
            <h2>Disqualifications</h2>
            <p class="section-desc">The following will result in a disqualification:</p>
            <ul>
              <li>Killing with an illegal setup, rules, or class</li>
              <li>Killing a player not participating in the match</li>
              <li>Hardscoping, relapse shots</li>
              <li>Killing a player with explosive objects on the map (barrels, cars, tanks) is legal, but only if the explosion was caused by a sniper</li>
              <li>Any form of cheating that gives you an unfair advantage — hacking/mods, IP flooding/DDoS, manipulating in-game mechanics/glitching, or assistance from a non-competing player</li>
            </ul>
          </section>
        }

        @if (activeGame === 'bo2') {
          <p class="disclaimer">A ref may request a PC check or screen share at any time. Failure to comply will result in a disqualification.</p>
        }
        @if (activeGame === 'mw2') {
          <p class="disclaimer">A ref may request to inspect your Xbox at any time. Failure to comply will result in a disqualification.</p>
        }
        @if (activeGame === 'mw2019') {
          <p class="disclaimer">A ref may request a screen share at any time. Failure to comply will result in a disqualification.</p>
        }
        @if (activeGame === 'bo2' || activeGame === 'mw2' || activeGame === 'mw2019') {
          <p class="disclaimer">Rules are subject to change. Not all situations are covered here.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .page-wrapper {
      background: #0a0a0f;
      min-height: 100%;
    }

    .rules-container {
      max-width: 720px;
      margin: 0 auto;
      padding: 48px 24px;
      height: 100%;
      overflow-y: auto;
    }

    h1 {
      font-size: 36px;
      font-weight: 700;
      color: white;
      margin: 0 0 40px;
    }

    section {
      margin-bottom: 32px;
    }

    h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--theme-primary-bright, #ff4444);
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    h3 {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.5);
      margin: 20px 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ul {
      margin: 0;
      padding: 0 0 0 20px;
      list-style: none;
    }

    li {
      position: relative;
      padding: 6px 0;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.65);
      line-height: 1.6;

      &::before {
        content: '';
        position: absolute;
        left: -14px;
        top: 14px;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
      }
    }

    a {
      color: var(--theme-primary-bright, #ff4444);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .settings-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .setting {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.025);
      border-radius: 6px;

      &:hover {
        background: rgba(255, 255, 255, 0.04);
      }

      &.changed {
        background: rgba(37, 99, 235, 0.08);
        border-left: 3px solid #2563EB;

        .setting-value {
          color: #60a5fa;
        }
      }
    }

    .setting-label {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }

    .setting-value {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
    }

    .note {
      margin: 12px 0 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }

    .section-desc {
      margin: 0 0 12px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.5);
    }

    .game-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 32px;
    }

    .game-tab {
      padding: 10px 24px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.02);
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;

      &:hover {
        border-color: rgba(255, 255, 255, 0.2);
        color: white;
        background: rgba(255, 255, 255, 0.05);
      }

      &.active {
        background: #2563EB;
        border-color: transparent;
        color: white;
        box-shadow: 0 4px 20px rgba(37, 99, 235, 0.4);
      }
    }

    .coming-soon {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 60px 20px;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: rgba(255, 255, 255, 0.15);
        margin-bottom: 16px;
      }

      h2 {
        border: none;
        padding: 0;
        margin: 0 0 8px;
        color: rgba(255, 255, 255, 0.8);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.4);
      }
    }

    .disclaimer {
      margin: 40px 0 0;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 13px;
      color: rgba(255, 255, 255, 0.3);
      font-style: italic;
    }

    @media (max-width: 480px) {
      .rules-container {
        padding: 32px 16px;
      }

      h1 {
        font-size: 28px;
      }

      .game-tab {
        flex: 1;
        text-align: center;
      }
    }
  `]
})
export class RulesComponent implements OnInit {
  activeGame: 'bo2' | 'mw2' | 'mw2019' = 'bo2';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const game = params['game'];
      if (game === 'bo2' || game === 'mw2' || game === 'mw2019') {
        this.activeGame = game;
      }
    });
  }

  setGame(game: 'bo2' | 'mw2' | 'mw2019'): void {
    this.activeGame = game;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { game },
      queryParamsHandling: 'merge'
    });
  }
}
