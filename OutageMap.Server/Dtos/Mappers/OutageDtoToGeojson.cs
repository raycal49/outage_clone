using NetTopologySuite.Features;

namespace OutageMap.Server.Models.Mappers;

public static class OutageEntityToGeojson
{
    public static FeatureCollection ConvertToFeatureCollection(List<OutageEntity> outages)
    {
        var featureCollection = new FeatureCollection();

        foreach (OutageEntity outage in outages)
        {
            AttributesTable properties = new()
            {
                { "id", outage.SourceId },
                { "startTime", outage.StartTime.ToUnixTimeMilliseconds() },
                { "etrTime", outage.EstimatedRestorationTime?.ToUnixTimeMilliseconds() },
                { "numPeople", outage.CustomersAffected },
                { "status", outage.Status },
                { "cause", outage.Cause },
                { "city", outage.City },
                { "county", outage.County },
                { "serviceArea", outage.ServiceArea },
                { "zipCode", outage.ZipCode }
            };

            featureCollection.Add(new Feature(outage.Location, properties));
        }

        return featureCollection;
    }
}