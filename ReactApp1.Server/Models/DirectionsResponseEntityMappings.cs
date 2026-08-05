using Azure.Core.GeoJson;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using ReactApp1.Server.Dtos;
using Route = ReactApp1.Server.Dtos.Route;

namespace ReactApp1.Server.Models
{
    public static class DirectionsResponseEntityMappings
    {
        private static readonly GeometryFactory GeometryFactory =
            NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

        private static ICollection<WaypointEntity> ConvertWaypointEntities(this DirectionsResponseDto dto)
        {
            ICollection<WaypointEntity> WaypointEntities = new List<WaypointEntity>();

            foreach (var w in dto.waypoints)
            {
                var waypoint = new WaypointEntity
                {
                    Name = w.name,
                    Location = w.location,
                    Distance = w.distance
                };
            }

            return WaypointEntities;
        }

        private static ICollection<RouteEntity> ConvertRouteEntities(this DirectionsResponseDto dto)
        {
            ICollection<RouteEntity> RouteEntities = new List<RouteEntity>();

            foreach (var r in dto.routes)
            {
                var route = new RouteEntity
                {
                    Distance = r.distance,
                    Duration = r.duration,
                    Weight = r.weight,
                    WeightName = r.weight_name,
                    Geometry = r.geometry.ToNts(),
                };

                if (r.legs is { Count: > 0 })
                {
                    foreach (var leg in r.legs)
                    {
                        route.Legs.Add(new RouteLegEntity
                        {
                            Summary = leg.summary,
                            Distance = leg.distance,
                            Duration = leg.duration,
                            Weight = leg.weight
                        });
                    }
                }
                RouteEntities.Add(route);
            }

            return RouteEntities;
        }

        public static DirectionsResponseEntity ToEntity(this DirectionsResponseDto dto)
        {
            var entity = new DirectionsResponseEntity
            {
                Uuid = dto.uuid,
                RouteEntities = dto.ConvertRouteEntities(),
                WaypointEntities = dto.ConvertWaypointEntities()
            };

            return entity;
        }

        public static DirectionsResponseDto ToDto(this DirectionsResponseEntity e)
        {
            return new DirectionsResponseDto
            {
                uuid = e.Uuid,
                
                routes = e.RouteEntities.Select(r => new Route
                {
                    distance = r.Distance,
                    duration = r.Duration,
                    weight = r.Weight,
                    weight_name = r.WeightName,
                    geometry = r.Geometry.FromNts(),
                    legs = r.Legs.Select(l => new RouteLeg
                    {
                        summary = l.Summary,
                        distance = l.Distance,
                        duration = l.Duration,
                        weight = l.Weight
                    }).ToList(),
                }).ToList(),

                waypoints = e.WaypointEntities.Select(r => new Waypoint
                {
                    name = r.Name,
                    location = r.Location,
                    distance = r.Distance
                }).ToList(),

            };
        }

        public static LineString? ToNts(this GeoJsonLineString? json)
        {
            if (json is null || json.Coordinates.Count == 0) return null;

            var coords = json.Coordinates
                .Where(c => c is { Length: >= 2 } && IsFinite(c[0]) && IsFinite(c[1]))
                .Select(c => new Coordinate(c[0], c[1]))            // ignore Z/M
                .ToArray();

            return coords.Length == 0 ? null : GeometryFactory.CreateLineString(coords);
        }

        public static GeoJsonLineString? FromNts(this LineString? ls)
        {
            if (ls is null || ls.IsEmpty) return null;

            return new GeoJsonLineString
            {
                Coordinates = ls.Coordinates
                    .Where(c => IsFinite(c.X) && IsFinite(c.Y))
                    .Select(c => new[] { c.X, c.Y })                 // emit 2D only
                    .ToList()
            };
        }

        private static bool IsFinite(double d) => !(double.IsNaN(d) || double.IsInfinity(d));
    }
}