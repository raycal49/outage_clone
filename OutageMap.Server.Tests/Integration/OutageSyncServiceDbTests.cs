using OutageMap.Server.Tests.Infrastructure.Integration;

namespace OutageMap.Server.Tests.Integration;

public sealed class OutageSyncServiceDbTests : OutageSyncTestBase, IClassFixture<SqlServerFixture>
{
    public OutageSyncServiceDbTests(SqlServerFixture database) : base(database)
    {
    }

    // seriously considering renaming SyncOutages to something like ApplySnapshotToStoredOutages or something like that
    [Fact]
    public async Task SyncOutages_NewOutagesExistInSnapshot_AddsOutages()
    {
        // i definitely think this being apply screenshots or something or apply updates solves a good chunk of our issues
        await Service.SyncOutages(
            [Outage(1001), Outage(1002)],
            TestContext.Current.CancellationToken);

        var outagesStoredInDb = await AllOutages();

        Assert.Contains(outagesStoredInDb, x => x.SourceId == 1001 && x.IsActive);
        Assert.Contains(outagesStoredInDb, x => x.SourceId == 1002 && x.IsActive);
    }

    [Fact]
    public async Task SyncOutages_ExistingOutageHasChanged_UpdatesOutage()
    {
        await Store(Outage(1001, customersAffected: 20, status: "Pending Assessment", cause: "Planned Outage"));

        await Service.SyncOutages(
            [Outage(1001, customersAffected: 500, status: "Crew dispatched", cause: "Weather")],
            TestContext.Current.CancellationToken);

        var updatedOutage = await Find(1001);

        Assert.Multiple(
            () => Assert.Equal(500, updatedOutage.CustomersAffected),
            () => Assert.Equal("Crew dispatched", updatedOutage.Status),
            () => Assert.Equal("Weather", updatedOutage.Cause));
    }

    [Fact]
    public async Task SyncOutages_ActiveOutageNotInLatestSnapshot_DeactivateOutage()
    {
        await Store(Outage(1001), Outage(2002));

        await Service.SyncOutages(
            [Outage(2002)],
            TestContext.Current.CancellationToken);

        var MissingFromSnapshot = await Find(1001);
        var FoundInSnapshot = await Find(2002);

        Assert.Multiple(
            () => Assert.False(MissingFromSnapshot.IsActive),
            () => Assert.True(FoundInSnapshot.IsActive));
    }

    [Fact]
    public async Task SyncOutages_SnapshotMatchesStoredOutages_DoesNothing()
    {
        await Store(Outage(1001));

        var result = await Service.SyncOutages(
            [Outage(1001)],
            TestContext.Current.CancellationToken);

        Assert.False(result.HasChanges);
    }
}
