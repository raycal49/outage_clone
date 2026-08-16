using OutageMap.Server.Tests.Infrastructure.Integration;

namespace OutageMap.Server.Tests.Integration;

public sealed class OutageSyncServiceDbTests : OutageSyncTestBase, IClassFixture<SqlServerFixture>
{
    public OutageSyncServiceDbTests(SqlServerFixture database) : base(database)
    {
    }

    [Fact]
    public async Task SyncStoredOutages_NewOutagesExistInSnapshot_AddsNewOutages()
    {
        await Service.SyncStoredOutages(
            [Outage(1001), Outage(1002)],
            TestContext.Current.CancellationToken);

        var storedOutages = await AllOutages();

        Assert.Contains(storedOutages, x => x.SourceId == 1001 && x.IsActive);
        Assert.Contains(storedOutages, x => x.SourceId == 1002 && x.IsActive);
    }

    [Fact]
    public async Task SyncStoredOutages_ExistingOutageHasChanged_UpdatesOutage()
    {
        await InsertIntoDb(Outage(1001, customersAffected: 20, status: "Pending Assessment", cause: "Planned Outage"));

        await Service.SyncStoredOutages(
            [Outage(1001, customersAffected: 500, status: "Crew dispatched", cause: "Weather")],
            TestContext.Current.CancellationToken);

        var updatedOutage = await Find(1001);

        Assert.Multiple(
            () => Assert.Equal(500, updatedOutage.CustomersAffected),
            () => Assert.Equal("Crew dispatched", updatedOutage.Status),
            () => Assert.Equal("Weather", updatedOutage.Cause));
    }

    [Fact]
    public async Task SyncStoredOutages_ActiveOutageNotInLatestSnapshot_DeactivateOutage()
    {
        await InsertIntoDb(Outage(1001), Outage(2002));

        await Service.SyncStoredOutages(
            [Outage(2002)],
            TestContext.Current.CancellationToken);

        var MissingFromSnapshot = await Find(1001);
        var FoundInSnapshot = await Find(2002);

        Assert.Multiple(
            () => Assert.False(MissingFromSnapshot.IsActive),
            () => Assert.True(FoundInSnapshot.IsActive));
    }

    [Fact]
    public async Task SyncStoredOutages_SnapshotMatchesStoredOutages_DoesNothing()
    {
        await InsertIntoDb(Outage(1001));

        var result = await Service.SyncStoredOutages(
            [Outage(1001)],
            TestContext.Current.CancellationToken);

        Assert.False(result.HasChanges);
    }
}
