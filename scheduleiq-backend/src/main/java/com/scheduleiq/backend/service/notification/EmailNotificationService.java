package com.scheduleiq.backend.service.notification;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@Async
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@scheduleiq.com}")
    private String senderEmail;

    @Value("${app.frontend-url:https://schedule-iq.vercel.app}")
    private String frontendUrl;

    public void sendEmail(String to, String subject, String contentHtml) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                
                helper.setFrom(senderEmail);
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText(contentHtml, true);
                
                mailSender.send(message);
                log.info("Email successfully sent to {}", to);
            } catch (MessagingException e) {
                log.error("Failed to send email to {}: {}", to, e.getMessage());
            } catch (Exception e) {
                log.error("General error sending email to {}: {}", to, e.getMessage());
            }
        });
    }

    public void sendEmployeeOnboardingEmail(String name, String email) {
        String subject = "Welcome to ScheduleIQ — Action Required";
        String content = "<html><body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>"
                + "<div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
                + "<h2 style='color: #2b25b3;'>Welcome to ScheduleIQ!</h2>"
                + "<p>Hi " + name + ",</p>"
                + "<p>Your manager has registered your account in ScheduleIQ. You are now authorized to sign in and manage your work schedule.</p>"
                + "<p style='margin-bottom: 25px;'>To access your account, click the link below to log in directly or use Google Sign-in:</p>"
                + "<a href='" + frontendUrl + "/login' style='background-color: #2b25b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Access Dashboard</a>"
                + "<p style='margin-top: 25px; font-size: 0.9em; color: #666;'>If you use Google Sign-In, please log in with your corporate/approved email: <strong>" + email + "</strong>.</p>"
                + "<hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;' />"
                + "<p style='font-size: 0.8em; color: #999;'>This is an automated notification. Please contact your store manager if you did not request this invitation.</p>"
                + "</div></body></html>";
        
        sendEmail(email, subject, content);
    }

    public void sendShiftPublishedEmail(String name, String email, String scheduleWeek) {
        String subject = "New Schedule Roster Published for Week: " + scheduleWeek;
        String content = "<html><body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>"
                + "<div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>"
                + "<h2 style='color: #2b25b3;'>Schedule Roster Published</h2>"
                + "<p>Hi " + name + ",</p>"
                + "<p>A new shift schedule has been published for the upcoming week <strong>" + scheduleWeek + "</strong>.</p>"
                + "<p>Please log in to your dashboard to review your assigned shifts, request swaps, or check team schedules.</p>"
                + "<a href='" + frontendUrl + "/login' style='background-color: #2b25b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>View My Shifts</a>"
                + "<hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;' />"
                + "<p style='font-size: 0.8em; color: #999;'>ScheduleIQ Automated Notifications</p>"
                + "</div></body></html>";
        
        sendEmail(email, subject, content);
    }

    public void sendCriticalAlertEmail(String name, String email, String message) {
        String subject = "🚨 Action Required: ScheduleIQ Critical Alert";
        String content = "<html><body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>"
                + "<div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; border-top: 4px solid #dc2626;'>"
                + "<h2 style='color: #dc2626;'>Critical Schedule Alert</h2>"
                + "<p>Hi " + name + ",</p>"
                + "<p>A critical alert has been flagged in the store operational schedule:</p>"
                + "<div style='background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; font-style: italic;'>"
                + message
                + "</div>"
                + "<p>Please log in to the Command Center to resolve this issue or find a replacement employee.</p>"
                + "<a href='" + frontendUrl + "/login' style='background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Go to Command Center</a>"
                + "<hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;' />"
                + "<p style='font-size: 0.8em; color: #999;'>ScheduleIQ Automated Notifications</p>"
                + "</div></body></html>";
        
        sendEmail(email, subject, content);
    }
}
