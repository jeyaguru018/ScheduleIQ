package com.scheduleiq.backend.security;

import com.scheduleiq.backend.model.Employee;
import com.scheduleiq.backend.repository.EmployeeRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final EmployeeRepository employeeRepository;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        
        Optional<Employee> employeeOpt = employeeRepository.findByEmail(email);
        
        if (employeeOpt.isPresent()) {
            Employee employee = employeeOpt.get();
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            
            String token = jwtService.generateToken(
                    Map.of(
                            "role", employee.getRole().name(),
                            "name", employee.getName(),
                            "employeeId", employee.getId()
                    ),
                    userDetails
            );
            
            String redirectUrl = "http://localhost:3000/oauth2/callback?token=" + token 
                    + "&role=" + employee.getRole().name()
                    + "&name=" + URLEncoder.encode(employee.getName(), StandardCharsets.UTF_8)
                    + "&employeeId=" + employee.getId();
            
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        } else {
            String redirectUrl = "http://localhost:3000/login?error=email_not_approved&email=" 
                    + URLEncoder.encode(email != null ? email : "", StandardCharsets.UTF_8);
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        }
    }
}
