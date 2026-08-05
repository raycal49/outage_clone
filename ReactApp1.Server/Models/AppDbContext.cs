using Microsoft.EntityFrameworkCore;

namespace ReactApp1.Server.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }

        public DbSet<DirectionsResponseEntity> DirectionsResponseEntities { get; set;}

        public DbSet<DisplayRouteEntity> DisplayRouteEntities { get; set;}
    }
}
