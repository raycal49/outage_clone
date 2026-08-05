using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace ReactApp1.Server.Models;

public class DirectionsResponseEntity
{
    [Key]
    public int Id { get; set; }

    public string Uuid { get; set; }

    public ICollection<RouteEntity> RouteEntities { get; set; } = new List<RouteEntity>();

    public ICollection<WaypointEntity>? WaypointEntities { get; set; }
}

public class RouteEntity
{
    [Key]
    public int Id { get; set; }

    public int RouteId { get; set; }

    public int DirectionsResponseId { get; set; }

    public DirectionsResponseEntity DirectionsResponse { get; set; }

    public double? Distance { get; set; }
    public double? Duration { get; set; }
    public double? Weight { get; set; }
    public string? WeightName { get; set; }

    public LineString? Geometry { get; set; }

    public ICollection<RouteLegEntity>? Legs { get; set; } = new List<RouteLegEntity>();
}

public class WaypointEntity
{
    [Key]
    public int Id { get; set; }

    public int DirectionsResponseEntityId { get; set; }

    public RouteEntity RouteEntity { get; set; }

    public string Name { get; set; }

    public double[] Location { get; set; }

    public double Distance { get; set; }
}

public class RouteLegEntity
{
    [Key]
    public int Id { get; set; }

    public int RouteEntityRouteId { get; set; }
                                                

    public RouteEntity RouteEntity { get; set; }

    public string? Summary { get; set; }
    public double Distance { get; set; }
    public double Duration { get; set; }
    public double? Weight { get; set; }
}