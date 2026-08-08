using Microsoft.EntityFrameworkCore;

namespace OutageMap.Server.Models;

    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }
    }
