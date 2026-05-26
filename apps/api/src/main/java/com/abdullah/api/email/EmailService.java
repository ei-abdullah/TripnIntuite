package com.abdullah.api.email;


import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String from;

    @Async
    public CompletableFuture<Void> sendVerificationEmail(String email, String verificationUrl) {
        return sendEmail(
                email,
                verificationUrl,
                "Verify your email — Majestor",
                "Verify email",
                "Welcome.",
                "Tap below to verify your email and start planning trips by feeling, not by name.",
                "Verify email"
        );
    }

    @Async
    public CompletableFuture<Void> sendForgotPasswordEmail(String email, String resetUrl) {
        return sendEmail(
                email,
                resetUrl,
                "Reset your password — Majestor",
                "Reset password",
                "Choose a new password.",
                "We received a request to reset your password. Tap below to set a new one.",
                "Reset password"
        );
    }

    private CompletableFuture<Void> sendEmail(
            String email,
            String actionUrl,
            String subject,
            String eyebrow,
            String heading,
            String message,
            String ctaLabel
    ) {
        try {
            String content = """
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#F7F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#111111;width:100%% !important;-webkit-text-size-adjust:100%%;-ms-text-size-adjust:100%%;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F7F5F0;padding:48px 20px;">
                        <tr>
                            <td align="center" valign="top">
                                <!-- Card -->
                                <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;border:1px solid #E4E0D8;max-width:560px;width:100%%;">

                                    <!-- Header (ink) -->
                                    <tr>
                                        <td align="center" style="background-color:#111111;padding:48px 32px;">
                                            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:400;color:#F7F5F0;letter-spacing:-0.01em;line-height:1;">
                                                <em style="font-style:italic;">Majestor</em>
                                            </p>
                                            <p style="margin:12px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#A39E96;">Travel by feeling</p>
                                        </td>
                                    </tr>

                                    <!-- Body -->
                                    <tr>
                                        <td align="center" style="padding:56px 40px 48px;">
                                            <p style="margin:0 0 18px;font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#6B6862;font-weight:500;">%s</p>
                                            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:400;color:#111111;letter-spacing:-0.02em;line-height:1.05;">
                                                %s
                                            </h1>
                                            <p style="margin:24px auto 36px;color:#6B6862;font-size:15px;line-height:1.65;max-width:400px;">
                                                %s
                                            </p>

                                            <!-- CTA -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                                                <tr>
                                                    <td align="center" style="background-color:#9C3D1A;border:1px solid #9C3D1A;">
                                                        <a href="%s" style="display:inline-block;padding:16px 36px;font-size:12px;font-weight:500;color:#F7F5F0;text-decoration:none;text-transform:uppercase;letter-spacing:0.22em;">
                                                            %s &rarr;
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>

                                            <!-- Divider -->
                                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="margin-top:48px;">
                                                <tr>
                                                    <td style="height:1px;background-color:#E4E0D8;line-height:1px;font-size:1px;">&nbsp;</td>
                                                </tr>
                                            </table>

                                            <!-- Alt link -->
                                            <p style="margin:32px 0 8px;color:#6B6862;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;">Or open this link:</p>
                                            <p style="margin:0;padding:0 12px;font-size:12.5px;line-height:1.55;word-break:break-all;">
                                                <a href="%s" style="color:#9C3D1A;text-decoration:underline;">%s</a>
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Footer (ink) -->
                                    <tr>
                                        <td align="center" style="background-color:#111111;padding:28px 32px;">
                                            <p style="margin:0 0 6px;color:#F7F5F0;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:-0.01em;line-height:1;"><em style="font-style:italic;">Majestor</em></p>
                                            <p style="margin:0;color:#A39E96;font-size:11px;line-height:1.55;">Automated message · please do not reply</p>
                                            <p style="margin:10px 0 0;color:#6B6862;font-size:11px;">&copy; 2026 Majestor. All rights reserved.</p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Bottom note (outside card) -->
                                <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%%;">
                                    <tr>
                                        <td align="center" style="padding:20px 16px;">
                                            <p style="margin:0;color:#A39E96;font-size:11px;text-align:center;line-height:1.5;">
                                                You received this because you signed up for Majestor.<br>
                                                If you didn't, you can safely ignore this email.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """.formatted(subject, eyebrow, heading, message, actionUrl, ctaLabel, actionUrl, actionUrl);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);

            helper.setTo(email);
            helper.setSubject(subject);
            helper.setFrom(from);
            helper.setText(content, true);

            mailSender.send(mimeMessage);

            return CompletableFuture.completedFuture(null);

        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", email, e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }
}
