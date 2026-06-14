package com.abdullah.api.email;

import org.springframework.stereotype.Service;

@Service
public class HtmlPageService {

    public String getVerificationLandingPage(String token) {
        String body = """
                <div class="mark"></div>
                <span class="eyebrow">Verify email</span>
                <h1>One last <em>step</em>.</h1>
                <p class="lede">Click below to confirm your email and activate your account.</p>
                <form action="/api/v1/auth/signup/verify" method="POST">
                    <input type="hidden" name="token" value="%s">
                    <button type="submit" class="btn-accent">Verify email <span class="arrow">&rarr;</span></button>
                </form>
                """.formatted(token);
        return page("Verify email — TripnIntuite", body);
    }

    public String getVerificationSuccessPage() {
        String body = """
                <div class="mark"></div>
                <span class="eyebrow">Verified</span>
                <h1>You're <em>in</em>.</h1>
                <p class="lede">Your account is active. You can close this page and sign in.</p>
                """;
        return page("Email verified — TripnIntuite", body);
    }

    public String getVerificationErrorPage(String errorMessage) {
        String displayMessage = "The verification link is invalid or has expired. Please request a new verification email from the app.";
        if (errorMessage != null && errorMessage.contains("already verified")) {
            displayMessage = "This email has already been verified. You can close this page and sign in to your account.";
        }
        String body = """
                <div class="mark"></div>
                <span class="eyebrow">Verification issue</span>
                <h1>Something's <em>off</em>.</h1>
                <p class="lede">%s</p>
                """.formatted(displayMessage);
        return page("Verification failed — TripnIntuite", body);
    }

    public String getPasswordResetSuccessPage() {
        String body = """
                <div class="mark"></div>
                <span class="eyebrow">Password updated</span>
                <h1>Reset <em>complete</em>.</h1>
                <p class="lede">Your password has been updated. You can sign in with the new one.</p>
                """;
        return page("Password reset — TripnIntuite", body);
    }

    public String getPasswordResetErrorPage(String errorMessage) {
        String displayMessage = "The password reset link is invalid or has expired. Please request a new password reset from the app.";
        String body = """
                <div class="mark"></div>
                <span class="eyebrow">Reset issue</span>
                <h1>Something's <em>off</em>.</h1>
                <p class="lede">%s</p>
                """.formatted(displayMessage);
        return page("Reset failed — TripnIntuite", body);
    }

    /* --------------------------------------------------------------------
     * Shared shell. Uses String.replace (not .formatted) because STYLES
     * contains literal "%" characters from CSS (100%, etc.) that would
     * otherwise be interpreted as format directives.
     * ------------------------------------------------------------------ */
    private String page(String title, String body) {
        return PAGE_TEMPLATE
                .replace("{{TITLE}}", title)
                .replace("{{STYLES}}", STYLES)
                .replace("{{BODY}}", body);
    }

    private static final String PAGE_TEMPLATE = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{{TITLE}}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500&display=swap" rel="stylesheet">
                <style>{{STYLES}}</style>
            </head>
            <body>
                <main class="shell">
                    <header class="topbar">
                        <div class="brand"><em>TripnIntuite</em></div>
                        <div class="sub">Travel by feeling</div>
                    </header>
                    <section class="card">
                        {{BODY}}
                    </section>
                    <footer class="foot">&copy; 2026 TripnIntuite</footer>
                </main>
            </body>
            </html>
            """;

    private static final String STYLES = """
            :root {
                --bg: #F7F5F0;
                --surface: #FFFFFF;
                --ink: #111111;
                --muted: #6B6862;
                --muted-2: #A39E96;
                --rule: #E4E0D8;
                --accent: #9C3D1A;
                --accent-ink: #F7F5F0;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { background: var(--bg); color: var(--ink); }
            body {
                font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                font-size: 14px;
                line-height: 1.55;
                -webkit-font-smoothing: antialiased;
            }
            .shell {
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 56px 24px;
                gap: 40px;
            }
            .topbar { text-align: center; }
            .topbar .brand {
                font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
                font-size: 36px;
                line-height: 1;
                letter-spacing: -0.01em;
                color: var(--ink);
            }
            .topbar .brand em { font-style: italic; }
            .topbar .sub {
                margin-top: 12px;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.22em;
                color: var(--muted);
            }
            .card {
                max-width: 540px;
                width: 100%;
                background: var(--surface);
                border: 1px solid var(--ink);
                padding: 56px 48px;
                text-align: center;
                animation: fadeUp 0.5s ease both;
            }
            @keyframes fadeUp {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .card .mark {
                width: 36px;
                height: 2px;
                background: var(--accent);
                margin: 0 auto 28px;
            }
            .card .eyebrow {
                display: inline-block;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.22em;
                color: var(--muted);
                font-weight: 500;
                margin-bottom: 20px;
            }
            .card h1 {
                font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif;
                font-weight: 400;
                font-size: 52px;
                line-height: 1;
                letter-spacing: -0.02em;
                color: var(--ink);
                margin: 0;
            }
            .card h1 em { font-style: italic; }
            .card .lede {
                margin: 24px auto 0;
                max-width: 44ch;
                color: var(--muted);
                font-size: 15px;
                line-height: 1.65;
            }
            .card form { margin-top: 36px; }
            .btn-accent {
                display: inline-flex;
                align-items: center;
                gap: 14px;
                padding: 16px 32px;
                background: var(--accent);
                color: var(--accent-ink);
                border: 1px solid var(--accent);
                font-family: inherit;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.22em;
                font-weight: 500;
                cursor: pointer;
                text-decoration: none;
                transition: background 0.2s ease, color 0.2s ease;
            }
            .btn-accent:hover {
                background: transparent;
                color: var(--accent);
            }
            .btn-accent .arrow { transition: transform 0.25s ease; }
            .btn-accent:hover .arrow { transform: translateX(4px); }
            .foot {
                color: var(--muted-2);
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.18em;
            }
            @media (max-width: 600px) {
                .card { padding: 40px 28px; }
                .card h1 { font-size: 40px; }
                .topbar .brand { font-size: 32px; }
            }
            """;
}
