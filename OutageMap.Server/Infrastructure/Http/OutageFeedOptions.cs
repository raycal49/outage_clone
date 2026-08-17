using System.ComponentModel.DataAnnotations;

namespace OutageMap.Server.Infrastructure.Http;

public sealed class OutageFeedOptions
{
    public const string SectionName = "OutageFeed";

    [Required]
    public required Uri Url { get; init; }

    public TimeSpan PollInterval { get; init; } = TimeSpan.FromMinutes(10);
}