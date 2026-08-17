using OutageMap.Server.Dtos;

namespace OutageMap.Server.Services;

public static class OutageValidator
{
    public static void Validate(List<OutageDto> outages)
    {
        bool invalid =
            outages.Count == 0 ||
            outages.Any(IsInvalid) ||
            outages
            .Select(x => x.Id)
            .Distinct()
            .Count() != outages.Count;

        if (invalid)
            throw new InvalidDataException("CenterPoint returned an invalid outage snapshot.");
    }

    private static bool IsInvalid(OutageDto outage) =>
        HasInvalidIdentity(outage) ||
        HasInvalidTime(outage) ||
        HasInvalidState(outage);

    private static bool HasInvalidIdentity(OutageDto outage) =>outage.Id <= 0;

    private static bool HasInvalidTime(OutageDto outage) =>
        outage.StartTime <= 0 ||
        outage.EtrTime <= 0;

    private static bool HasInvalidState(OutageDto outage) =>
        outage.NumPeople < 0 ||
        string.IsNullOrWhiteSpace(outage.Status) ||
        outage.AdditionalProperties is null;
}