using System.Text.Json.Serialization;

namespace ReactApp1.Server.Dtos
{
    public sealed class DirectionsResponseDto
    {
        public string code { get; init; } = default!;
        public ICollection<Route>? routes { get; init; }
        public string? uuid { get; init; }

        public List<Waypoint>? waypoints { get; init; }
    }
    public sealed class Route
    {
        public double? distance { get; init; }
        public double? duration { get; init; }
        public double? weight { get; init; }
        public string? weight_name { get; init; }
        public GeoJsonLineString? geometry { get; init; } = default!;
        public List<RouteLeg>? legs { get; init; }
    }

    public sealed class Waypoint
    {
        public string name { get; init; }

        public double[] location { get; init; }

        public double distance { get; init; }
    }

    public sealed class RouteLeg
    {
        public string? summary { get; init; }
        public double distance { get; init; }
        public double duration { get; init; }
        public double? weight { get; init; }
    }

    public sealed class GeoJsonLineString
    {
        [JsonPropertyName("type")]
        public string Type { get; init; } = "LineString";

        [JsonPropertyName("coordinates")]
        public List<double[]> Coordinates { get; init; } = new();
    }
}
