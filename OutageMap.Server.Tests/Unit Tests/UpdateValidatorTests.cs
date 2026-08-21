using OutageMap.Server.Dtos;
using OutageMap.Server.Services;

namespace OutageMap.Server.Tests;

public class OutageValidatorTests
{
    private readonly OutageDto _outage;
    private readonly List<OutageDto> _outages;

    public OutageValidatorTests()
    {
        _outage = new OutageDto
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

        _outages = [_outage];
    }

    [Fact]
    public void Validate_ValidSnapshot_DoesNotThrow()
    {
        var exception = Record.Exception(() => OutageValidator.Validate(_outages));

        Assert.Null(exception);
    }

    [Fact]
    public void Validate_EmptySnapshot_Throws()
    {
        _outages.Clear();

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }

    [Fact]
    public void Validate_InvalidId_Throws()
    {
        _outage.Id = 0;

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }

    [Fact]
    public void Validate_InvalidStartTime_Throws()
    {
        _outage.StartTime = 0;

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }

    [Fact]
    public void Validate_InvalidEtrTime_Throws()
    {
        _outage.EtrTime = 0;

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }

    [Fact]
    public void Validate_InvalidCustomersAffected_Throws()
    {
        _outage.NumPeople = -1;

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }

    [Fact]
    public void Validate_InvalidStatus_Throws()
    {
        _outage.Status = "";

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }

    [Fact]
    public void Validate_MissingAdditionalProperties_Throws()
    {
        _outage.AdditionalProperties = null;

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }

    [Fact]
    public void Validate_DuplicateIds_Throws()
    {
        _outages.Add(new OutageDto { Id = _outage.Id });

        Assert.Throws<InvalidDataException>(() => OutageValidator.Validate(_outages));
    }
}
