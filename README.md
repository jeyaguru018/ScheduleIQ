# ScheduleIQ: AI Workforce Orchestration

**ScheduleIQ** is an intelligent, containerized workforce management platform designed to solve the complex problem of dynamic employee scheduling in high-turnover, variable-demand industries (like retail, fulfillment, and hospitality). 

By leveraging constraint-based algorithms and a dedicated Machine Learning microservice, ScheduleIQ optimizes shift allocation, predicts no-show risks, and manages peer-to-peer shift swaps—all while strictly adhering to budget constraints and labor fairness rules.

---

## The Problem Statement

In dynamic hourly-wage environments, managers spend an average of 4-6 hours per week manually building schedules. The process is fraught with friction:
- **Budget Overruns:** Accidentally scheduling employees for overtime.
- **Coverage Gaps:** Failing to align staffing levels with unpredictable customer footfall.
- **No-Shows:** Employees missing shifts without warning, leading to operational chaos.
- **Swap Friction:** Manual, text-message-based shift swapping that leaves managers out of the loop and ruins coverage.

### Existing Systems vs. ScheduleIQ
**Existing Systems (Legacy Software & Spreadsheets):**
Most existing solutions (like traditional HCM software or Excel) act simply as digital calendars. They rely entirely on human input, offer no predictive analytics, and process shift trades blindly without considering the operational impact (e.g., swapping a highly reliable employee for an unreliable one).

**Our Solution (ScheduleIQ):**
ScheduleIQ doesn't just record schedules; it *generates* and *protects* them. 
- **AI-Driven Generation:** A constraint-based engine generates optimal schedules that maximize coverage while mathematically guaranteeing budget compliance.
- **Predictive Risk Modeling:** A Python ML microservice analyzes employee history to flag high "No-Show Risks" before the shift begins.
- **Intelligent Swap Marketplace:** A peer-to-peer marketplace where employees can trade shifts. The system automatically audits the trade and warns managers if the new employee violates overtime rules or poses an attendance risk.

---

## Project Architecture

ScheduleIQ is built as a microservice-inspired architecture, entirely containerized via Docker.

1. **Frontend (React + Vite + TailwindCSS)**
   - Role-based SPA (Manager Dashboard vs. Mobile-First Employee View).
   - Premium, highly responsive UI with interactive data visualization.
2. **Backend Engine (Spring Boot + Java 21)**
   - Secure REST API orchestration.
   - JWT-based Stateless Authentication via Google OAuth2.
   - Complex relational mapping using Hibernate/JPA.
3. **ML Microservice (Python + Flask)**
   - Isolated service specifically built to handle data-science and predictive modeling endpoints without bloating the Java backend.
4. **Database (PostgreSQL)**
   - Highly structured relational data layer ensuring transactional integrity across schedules, employees, and shift swaps.

---

## Deployment & Setup Instructions (Free Tier)

This project is fully Dockerized, making it incredibly easy to deploy using free-tier PaaS (Platform as a Service) providers like **Render** or **Railway**.

### Local Development
To run the entire stack locally with zero configuration:
1. Ensure Docker Desktop is running.
2. Run `docker compose up --build -d`.
3. Access the frontend at `http://localhost:3000` and the backend API at `http://localhost:8080`.

### Cloud Deployment (Render / Railway)
To deploy this project to the cloud for your portfolio:

1. **Database:** 
   - Spin up a free PostgreSQL database on Render or Railway.
   - Note the connection string (e.g., `postgresql://user:pass@host/dbname`).
2. **Spring Boot Backend:**
   - Create a new "Web Service" on Render.
   - Point it to your GitHub repository.
   - Set the Root Directory to `scheduleiq-backend`.
   - Set the Build Command to `./mvnw clean package -DskipTests`.
   - Set the Start Command to `java -jar target/backend-0.0.1-SNAPSHOT.jar`.
   - **Environment Variables:** Add `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD` pointing to your cloud database.
3. **Python ML Service:**
   - Create a second "Web Service".
   - Set Root Directory to `scheduleiq-ml-service`.
   - Render will auto-detect the `requirements.txt` and `app.py`.
4. **React Frontend:**
   - Create a "Static Site" on Render or Vercel.
   - Point it to `scheduleiq-frontend`.
   - Set Build Command to `npm run build`.
   - Set Publish Directory to `dist`.
   - Add the Environment Variable `VITE_API_BASE_URL` pointing to your deployed Spring Boot URL.

---

## Key Technical Highlights for Resume/Interviews

- **Polyglot Microservices:** Demonstrated ability to decouple business logic (Java) from data science (Python) via internal REST communication.
- **Advanced State Management:** Utilized React Hooks and centralized API layers for clean, robust frontend data flows.
- **Relational Integrity:** Designed a normalized PostgreSQL schema to handle complex Many-to-Many relationships and cascading operations safely.
- **Containerization:** Wrote custom multi-stage Dockerfiles and a `docker-compose.yml` to ensure exact parity between local development and cloud production.
