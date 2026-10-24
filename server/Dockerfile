FROM python:3.12-slim-bookworm AS build
RUN apt-get update && apt-get install -y --no-install-recommends git g++ make cmake libboost-filesystem-dev libboost-regex-dev libboost-random-dev libboost-thread-dev libboost-test-dev libboost-timer-dev && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch v1.3.4 https://github.com/Universite-Gustave-Eiffel/I-Simpa.git /opt/isimpa
WORKDIR /app
COPY server /app/server
RUN python server/build-spps.py --source /opt/isimpa --build /opt/spps
ENV SPPS_BINARY=/opt/spps/native/spps/spps PORT=8080
EXPOSE 8080
CMD ["python", "-m", "server.api"]
