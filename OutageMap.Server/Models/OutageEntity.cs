using NetTopologySuite.Geometries;

public sealed class OutageEntity
{
    public long Id { get; set; }
    public long SourceId { get; set; }

    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset? EstimatedRestorationTime { get; set; }

    public int CustomersAffected { get; set; }
    public string Status { get; set; } = null!;
    public string? Cause { get; set; }

    public Point Location { get; set; } = null!;

    public string? City { get; set; }
    public string? County { get; set; }
    public string? ServiceArea { get; set; }
    public string? ZipCode { get; set; }

    public bool IsActive { get; set; }

    public DateTimeOffset FirstSeenAt { get; set; }
    public DateTimeOffset LastChangedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
}
