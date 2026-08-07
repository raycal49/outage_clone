# outage-map

A web map of live CenterPoint Energy power outages in Texas. An ASP.NET Core
API fetches the public outage feed, converts it to GeoJSON, and a React +
Mapbox client renders it.

**Status: mid-refactor.** The project began as a Visual Studio React/ASP.NET
Core template that also carried a Mapbox driving-directions feature. That
feature is being removed and the server restructured into layers. The server
side of the removal is complete; the client still contains directions code.
See [Known issues](#known-issues) before assuming anything works end to end.

## Stack

| | |
|---|---|
| Server | ASP.NET Core, .NET 10 |
| Data | SQL Server + EF Core 10 (NetTopologySuite for spatial types) |
| Cache | Redis (registered, not yet used) |
| Client | React 19, TypeScript, Vite 7, Mapbox GL |
| Tests | xUnit + RichardSzalay.MockHttp |

## Prerequisites

- **.NET 10 SDK** — Visual Studio 2026 (v18) or newer. VS 2022 cannot target
  net10.0 and will fail with `NETSDK1209`.
- **Node.js 20.19+ or 22.12+** — required by Vite 7.
- **SQL Server** — any edition, including LocalDB.
- **Redis** — reachable at whatever you configure.
- **A Mapbox access token** — <https://account.mapbox.com/>

## Configuration

Two files are required and **neither is in source control** — both are
gitignored. A fresh clone will not run until you create them.

### 1. `OutageMap.Server/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=OutageMap;Trusted_Connection=True;TrustServerCertificate=True",
    "Redis": "localhost:6379"
  }
}
```

Both keys are read at startup. `DefaultConnection` throws a clear
`InvalidOperationException` if missing. `Redis` does **not** — see
[Known issues](#known-issues).

### 2. `outagemap.client/.env`

```
VITE_MAPBOX_TOKEN=pk.your_token_here
```

Without it the map renders blank.

> **If you are moving or renaming the project directories**, remember that
> `git` does not touch ignored files. Both of the above stay behind in the old
> folder and must be moved by hand. `git status --ignored` will show them.

## Running

```
dotnet run --project OutageMap.Server --launch-profile https
```

`Microsoft.AspNetCore.SpaProxy` starts the Vite dev server automatically, so
you do not launch the client separately.

- App: <https://localhost:7142>
- Swagger (Development only): <https://localhost:7142/swagger>
- Vite dev server: <https://localhost:5173>

From Visual Studio, open `OutageMap.sln` and run the `https` profile.

First run generates a local dev certificate via `dotnet dev-certs`; accept the
prompt if your browser warns.

## Testing

```
dotnet test
```

Two server tests cover `OutageService`. There are no frontend tests yet — the
`.esproj` declares Vitest, but `vitest` is not in `package.json`.

## Project layout

```
OutageMap.sln
├── OutageMap.Server/            ASP.NET Core API
│   ├── Api/Controllers/         HTTP surface
│   ├── Application/Outages/     use-case logic (GeoJSON conversion)
│   ├── Infrastructure/
│   │   ├── Http/                CenterPoint feed client + its DTO
│   │   └── Persistence/         EF Core DbContext
│   ├── Fixtures/                sample feed payload
│   └── Program.cs
├── OutageMap.Server.Tests/      xUnit tests
└── outagemap.client/            React + Vite SPA
```

### Dependency rule

Dependencies point **inward**: `Api` → `Application` → (eventually) `Domain`.
`Infrastructure` may depend inward; nothing inward may depend on
`Infrastructure`. Namespaces mirror the folders, so a `using` shows you the
layer.

Two violations of this exist today and are tracked below.

## API

One endpoint:

```
GET /OutageMap/OutageData
```

Fetches the CenterPoint feed, converts it to a GeoJSON `FeatureCollection`,
and returns it. Each feature is a `Point` at the outage's coordinates, with
properties `id`, `startTime`, `lastUpdatedTime`, `etrTime`, `numPeople`,
`status`, `cause`, `identifier`, and `additionalProperties`.

`cause` is null for most records — the upstream feed only supplies it for a
minority — which is expected, not a bug.

Upstream source:
`https://centerpoint.datacapable.com/datacapable/v2/p/centerpoint/r/texas/map/events`

## Known issues

These are real and currently unfixed. They are listed so nobody rediscovers
them the hard way.

**The client still contains the removed directions feature.** The map shows
two draggable start/end markers, and `Map.tsx` calls two endpoints whose
controllers were deleted server-side — `/Directions/Directions` and
`Dashboard/SaveRoute`. Both now 404. `Dashboard.tsx` and
`assets/DirectionsControl.tsx` are entirely directions/route code, and
`vite.config.ts` still proxies `^/Dashboard` and `^/Directions`.

**`npm run build` fails.** 13 TypeScript errors under `noUnusedLocals` /
`noUnusedParameters`, nearly all in the leftover directions code: unused
imports and locals in `App.tsx` and `Dashboard.tsx`, a missing type
declaration for `@mapbox/mapbox-gl-directions`, four stale
`@ts-expect-error` directives in `DirectionsControl.tsx`, and a `_map`
property access in `Geocoder.tsx` that is not on the `MapboxGeocoder` type.
`npm run dev` is unaffected — Vite does not typecheck.

**`VITE_MAPBOX_TOKEN` is baked in at build time.** Vite statically replaces
`import.meta.env.VITE_*` when bundling, so the token cannot be supplied as a
runtime container environment variable. Containerising this app means either
building per-environment images or moving the token server-side.

**Two layering violations.** Both stem from `OutageDataDto` — the shape of
CenterPoint's JSON, an infrastructure concern — leaking into the application
layer:

1. `Application/Outages/GeoJsonConversions.cs` imports `Infrastructure.Http`
   because `ConvertToFeatureCollection` takes `List<OutageDataDto>`.
2. `IOutageService` sits in `Infrastructure/Http/` rather than an application
   abstractions folder, because its signature returns `List<OutageDataDto>`.
   Moving it inward would force `Application` to reference `Infrastructure`.

Both resolve together once domain entities exist.

**`AppDbContext` is empty.** Every table in the original migrations belonged
to the directions feature and was deleted with it. There is no model and no
migration; nothing is persisted yet.

**The Redis connection string is read without a null check.** `Program.cs`
reads `ConnectionStrings:Redis` into a non-nullable `string` and passes it
straight to `AddStackExchangeRedisCache`. Omitting it fails later and less
clearly than the SQL connection string does.

**`azure-pipelines.yml` is the wrong template.** It is the .NET *Framework*
pipeline — `NuGetToolInstaller`, `VSBuild`, `VSTest`, triggering on `master`.
It will not build this solution.

## Roadmap

**Done**

- Removed the Mapbox driving-directions feature from the server: controllers,
  services, DTOs, EF entities, migrations, and DI registrations.
- Fixed GeoJSON conversion bugs — `cause` was populated from `status`, and
  `additionalProperties` was emitted with a typo'd key.
- Removed a startup log line that printed the connection string with
  credentials, and gated EF sensitive-data logging behind Development.
- Pruned unused packages and aligned the EF Core stack.
- Retargeted to .NET 10.
- Renamed the projects from the `ReactApp1` template defaults.
- Reorganised the server into `Api` / `Application` / `Infrastructure`.

**Planned**

- Domain entities for outages, replacing `OutageDataDto` in the application
  layer and resolving both layering violations.
- Persist outage snapshots; give `AppDbContext` a real model and a migration.
- Use the Redis cache that is currently registered but unused.
- Strip the directions code from the client and get `npm run build` green.
- Frontend tests with Vitest.
- Containerisation.
- Integration tests alongside the existing unit tests.
