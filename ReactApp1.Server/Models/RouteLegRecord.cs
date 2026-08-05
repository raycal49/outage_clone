using NetTopologySuite.Geometries;

namespace ReactApp1.Server.Models
{
    public sealed class RouteLegRecord
    {
        public Guid Id { get; set; }
        public Guid RouteId { get; set; }
        public LineString Geometry { get; set; }
        public double DistanceMeters { get; set; }
        public double DurationSeconds { get; set; }
        public string Summary { get; set; }
    }
}
