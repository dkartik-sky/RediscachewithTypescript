# ── Stage 1: build & publish ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first (layer-cached until .csproj changes)
COPY RedisCachingApi.csproj ./
RUN dotnet restore

COPY . ./
RUN dotnet publish RedisCachingApi.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

# ── Stage 2: runtime ─────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Override the hard-coded UseUrls so Kestrel binds on all interfaces
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

COPY --from=build /app/publish ./

ENTRYPOINT ["dotnet", "RedisCachingApi.dll"]
