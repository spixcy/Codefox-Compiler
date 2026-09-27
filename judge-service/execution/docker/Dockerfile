FROM python:3.11-alpine

# Create a non-root user
RUN addgroup -S runner && adduser -S runner -G runner

# Set working directory
WORKDIR /app

# Copy the runner script
COPY runner.py /app/runner.py

# Set ownership
RUN chown -R runner:runner /app

# Switch to non-root user
USER runner

# Run the runner script by default
ENTRYPOINT ["python", "/app/runner.py"]
