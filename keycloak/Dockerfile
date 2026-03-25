FROM quay.io/keycloak/keycloak:24.0.4 as builder

# Copy theme JAR first (before build)
COPY rita-theme-v2.jar /opt/keycloak/providers/rita-theme-v2.jar

# Build with PostgreSQL support, health checks, and theme
USER root
WORKDIR /opt/keycloak
RUN chown keycloak:keycloak /opt/keycloak/providers/rita-theme-v2.jar && \
    /opt/keycloak/bin/kc.sh build --db=postgres --health-enabled=true

FROM quay.io/keycloak/keycloak:24.0.4

# Copy built artifacts (includes theme)
COPY --from=builder /opt/keycloak/ /opt/keycloak/

USER keycloak

# Start in production mode
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
