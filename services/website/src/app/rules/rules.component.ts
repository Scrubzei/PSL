import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-wrapper">
      <div class="rules-container">
        <h1>Black Ops 2 — 1v1 Rules</h1>

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
          </ul>
        </section>
        <p class="disclaimer">Rules are subject to change. Not all situations are covered here.</p>
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
    }
  `]
})
export class RulesComponent {}
