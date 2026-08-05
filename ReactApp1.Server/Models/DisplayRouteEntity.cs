using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace ReactApp1.Server.Models;

public class DisplayRouteEntity
{
    [Key]
    public int Id { get; set; }

    public string Name { get; set; }

    public double Duration { get; set; }

    public double Distance { get; set; }
}

