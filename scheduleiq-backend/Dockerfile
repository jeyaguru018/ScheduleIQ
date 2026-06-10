# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

# Copy maven wrapper and pom first (layer cache)
COPY mvnw mvnw.cmd pom.xml ./
COPY .mvn .mvn

# Download dependencies
RUN ./mvnw dependency:go-offline -B

# Copy source and build
COPY src src
RUN ./mvnw package -DskipTests -B

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user for security
RUN addgroup -S scheduleiq && adduser -S scheduleiq -G scheduleiq
USER scheduleiq

COPY --from=build /workspace/target/*.jar app.jar

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/api/auth/health || exit 1

ENTRYPOINT ["java", "-Xms256m", "-Xmx512m", "-jar", "app.jar"]
