using NetTopologySuite.Features;

public interface IOutageReader
{
    Task<FeatureCollection> GetActiveOutages(CancellationToken cancellationToken);
}