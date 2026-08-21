#nullable disable

using NetTopologySuite;
using OutageMap.Server.Dtos;
using OutageMap.Server.Dtos.Mappers;
using OutageMap.Server.Models;
using OutageMap.Server.Services;

namespace OutageMap.Server.Tests;

public class OutageUpdaterTests
{
    private readonly OutageDto _dto;
    private readonly OutageEntity _stored;

    public OutageUpdaterTests()
    {
        var geometryFactory =
            NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

        _dto = new OutageDto
        {
            Id = 1,
            StartTime = 1_700_000_000_000,
            EtrTime = 1_700_003_600_000,
            NumPeople = 100,
            Status = "Investigating",
            Cause = "Unknown",
            Latitude = 29.7604,
            Longitude = -95.3698,
            AdditionalProperties = []
        };

        _stored = OutageDtoToEntity.ConvertToOutage(_dto);
    }

    [Fact]
    public void Update_NoChanges_UpdateReturnsFalse()
    {
        Assert.False(OutageUpdater.Update(_dto, _stored));
    }

    [Fact]
    public void Update_EtrChanged_UpdateReturnsTrue()
    {
        _dto.EtrTime = null;

        Assert.True(OutageUpdater.Update(_dto, _stored));
    }

    [Fact]
    public void Update_CustomersAffectedChanged_UpdateReturnsTrue()
    {
        _dto.NumPeople++;

        Assert.True(OutageUpdater.Update(_dto, _stored));
    }

    [Fact]
    public void Update_StatusChanged_UpdateReturnsTrue()
    {
        _dto.Status = "Crew dispatched";

        Assert.True(OutageUpdater.Update(_dto, _stored));
    }

    [Fact]
    public void Update_CauseChanged_UpdateReturnsTrue()
    {
        _dto.Cause = "Weather";

        Assert.True(OutageUpdater.Update(_dto, _stored));
    }

    [Fact]
    public void Update_LocationChanged_UpdateReturnsTrue()
    {
        _dto.Longitude++;

        Assert.True(OutageUpdater.Update(_dto, _stored));
    }
}
