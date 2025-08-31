# Build pgvector in a builder stage
FROM postgres:15-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make gcc musl-dev postgresql15-dev

# Build pgvector - ignore LLVM bitcode errors since we only need the .so file
WORKDIR /tmp
RUN git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git && \
    cd pgvector && \
    make clean && \
    (make OPTFLAGS="" || true) && \
    mkdir -p /usr/local/share/postgresql/extension && \
    mkdir -p /usr/local/lib/postgresql && \
    cp vector.so /usr/local/lib/postgresql/ && \
    cp sql/vector--*.sql /usr/local/share/postgresql/extension/ && \
    cp vector.control /usr/local/share/postgresql/extension/

# Final stage
FROM postgres:15-alpine

# Copy pgvector files from builder
COPY --from=builder /usr/local/share/postgresql/extension/vector* /usr/local/share/postgresql/extension/
COPY --from=builder /usr/local/lib/postgresql/vector.so /usr/local/lib/postgresql/

# Verify installation
RUN ls -la /usr/local/share/postgresql/extension/vector* && \
    ls -la /usr/local/lib/postgresql/vector.so