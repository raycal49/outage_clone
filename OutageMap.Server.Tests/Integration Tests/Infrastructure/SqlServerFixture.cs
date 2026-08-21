using Microsoft.EntityFrameworkCore;
using OutageMap.Server.Models;
using Testcontainers.MsSql;

namespace OutageMap.Server.Tests.Infrastructure.Integration;

public sealed class SqlServerFixture : IAsyncLifetime
{
    private readonly MsSqlContainer _container = new MsSqlBuilder(
            "mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04")
        .WithDatabase("OutageMapTests")
        .Build();

    private string _connectionString = null!;

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();

        _connectionString = _container.GetConnectionString();

        await using AppDbContext db = CreateContext();
        await db.Database.MigrateAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await _container.DisposeAsync();
    }

    public AppDbContext CreateTestContext()
    {
        AppDbContext db = CreateContext();

        // Each test gets its own transaction. Disposing the context rolls it back.
        db.Database.BeginTransaction();

        return db;
    }

    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(_connectionString, sql => sql.UseNetTopologySuite())
            .Options;

        return new AppDbContext(options);
    }
}
