package com.abdullah.api.email;


import com.abdullah.api.trip.dto.ItineraryEmailRequest;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
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
                "Verify your email — TripnIntuite",
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
                "Reset your password — TripnIntuite",
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
                                                <em style="font-style:italic;">TripnIntuite</em>
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
                                            <p style="margin:0 0 6px;color:#F7F5F0;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:-0.01em;line-height:1;"><em style="font-style:italic;">TripnIntuite</em></p>
                                            <p style="margin:0;color:#A39E96;font-size:11px;line-height:1.55;">Automated message · please do not reply</p>
                                            <p style="margin:10px 0 0;color:#6B6862;font-size:11px;">&copy; 2026 TripnIntuite. All rights reserved.</p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Bottom note (outside card) -->
                                <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%%;">
                                    <tr>
                                        <td align="center" style="padding:20px 16px;">
                                            <p style="margin:0;color:#A39E96;font-size:11px;text-align:center;line-height:1.5;">
                                                You received this because you signed up for TripnIntuite.<br>
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

    // ── Itinerary / booking confirmation ──────────────────────────────────
    // List-style email (flights + stays + totals) with the trip's .ics attached.
    // Same template backs both the auto-sent checkout confirmation and the
    // on-demand resend from the trip page.
    @Async
    public CompletableFuture<Void> sendItineraryEmail(ItineraryEmailRequest req) {
        try {
            String content = renderItinerary(req);
            String ics = IcsBuilder.build(req);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
            helper.setTo(req.to());
            helper.setSubject("Your trip is booked — " + safe(req.title()));
            helper.setFrom(from);
            helper.setText(content, true);
            helper.addAttachment(
                    "tripnintuite-trip.ics",
                    new ByteArrayResource(ics.getBytes(StandardCharsets.UTF_8)),
                    "text/calendar"
            );

            mailSender.send(mimeMessage);
            return CompletableFuture.completedFuture(null);
        } catch (Exception e) {
            log.error("Failed to send itinerary email to {}: {}", req.to(), e.getMessage(), e);
            return CompletableFuture.failedFuture(e);
        }
    }

    private String renderItinerary(ItineraryEmailRequest req) {
        List<ItineraryEmailRequest.EmailFlight> flights =
                req.flights() != null ? req.flights() : List.of();
        List<ItineraryEmailRequest.EmailHotel> hotels =
                req.hotels() != null ? req.hotels() : List.of();

        StringBuilder rows = new StringBuilder();
        if (!flights.isEmpty()) {
            rows.append(sectionHeading("Flights"));
            for (ItineraryEmailRequest.EmailFlight f : flights) {
                rows.append(lineItem(
                        safe(f.label()),
                        safe(f.carrierName()) + " · " + safe(f.route()),
                        "Ref " + safe(f.bookingRef()),
                        money(f.price(), f.currency())
                ));
            }
        }
        if (!hotels.isEmpty()) {
            rows.append(sectionHeading("Stays"));
            for (ItineraryEmailRequest.EmailHotel h : hotels) {
                String ref = h.hotelConfirmationCode() != null && !h.hotelConfirmationCode().isBlank()
                        ? h.hotelConfirmationCode()
                        : safe(h.bookingId());
                rows.append(lineItem(
                        safe(h.label()),
                        safe(h.name()),
                        safe(h.dates()) + " · " + ref,
                        money(h.price(), h.currency())
                ));
            }
        }

        double total = req.flightsTotal() + req.hotelsTotal();
        String currency = safe(req.currency());

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background-color:#F7F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#111111;width:100%% !important;-webkit-text-size-adjust:100%%;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F7F5F0;padding:48px 20px;">
                    <tr><td align="center" valign="top">
                        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF;border:1px solid #E4E0D8;max-width:560px;width:100%%;">
                            <tr><td align="center" style="background-color:#111111;padding:40px 32px;">
                                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;color:#F7F5F0;line-height:1;"><em style="font-style:italic;">TripnIntuite</em></p>
                                <p style="margin:12px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#A39E96;">You're booked</p>
                            </td></tr>
                            <tr><td style="padding:40px 36px 16px;">
                                <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.22em;color:#6B6862;">Itinerary</p>
                                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#111111;letter-spacing:-0.01em;line-height:1.15;">%s</h1>
                                <p style="margin:10px 0 0;color:#6B6862;font-size:13px;">Departing from %s · everything below is confirmed. The attached calendar file (.ics) adds it all to your calendar.</p>
                            </td></tr>
                            <tr><td style="padding:8px 36px 8px;">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">%s</table>
                            </td></tr>
                            <tr><td style="padding:8px 36px 40px;">
                                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="border-top:2px solid #111111;margin-top:8px;">
                                    <tr><td style="padding-top:16px;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#111111;">Total paid</td>
                                        <td align="right" style="padding-top:16px;font-family:Georgia,serif;font-size:22px;color:#111111;">%s</td></tr>
                                </table>
                            </td></tr>
                            <tr><td align="center" style="background-color:#111111;padding:24px 32px;">
                                <p style="margin:0;color:#A39E96;font-size:11px;line-height:1.55;">Automated confirmation · Flight bookings are sandbox-simulated.<br>&copy; 2026 TripnIntuite. Travel by feeling.</p>
                            </td></tr>
                        </table>
                    </td></tr>
                </table>
            </body>
            </html>
            """.formatted(safe(req.title()), safe(req.homeIata()), rows.toString(),
                money(total, currency));
    }

    private static String sectionHeading(String label) {
        return """
            <tr><td colspan="2" style="padding:20px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#9C3D1A;border-bottom:1px solid #E4E0D8;">%s</td></tr>
            """.formatted(safe(label));
    }

    private static String lineItem(String label, String primary, String meta, String price) {
        return """
            <tr>
                <td style="padding:14px 0;border-bottom:1px solid #F0EDE6;">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.16em;color:#A39E96;">%s</div>
                    <div style="font-size:15px;color:#111111;margin-top:3px;">%s</div>
                    <div style="font-size:12px;color:#6B6862;margin-top:2px;">%s</div>
                </td>
                <td align="right" valign="top" style="padding:14px 0;border-bottom:1px solid #F0EDE6;font-family:Georgia,serif;font-size:15px;color:#111111;white-space:nowrap;">%s</td>
            </tr>
            """.formatted(label, primary, meta, price);
    }

    private static String money(double amount, String currency) {
        return safe(currency) + " " + Math.round(amount);
    }

    private static String safe(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
