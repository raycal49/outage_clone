using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReactApp1.Server.Dtos;
using ReactApp1.Server.Models;

namespace ReactApp1.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _dbService;

        public DashboardController(AppDbContext dbService)
        {
            _dbService = dbService;
        }

        [HttpPost("SaveRoute")]
        public async Task<ActionResult<DisplayRouteEntity>> SaveRoute([FromBody] DisplayRouteDto dto)
        {
            Console.WriteLine("Entered the SaveRoute endpoint!");

            DisplayRouteEntity entity = new DisplayRouteEntity
            {
                Name = dto.Name,
                Distance = dto.Distance,
                Duration = dto.Duration
            };

            if (_dbService.Find<DisplayRouteEntity>(entity.Id) is null)
            {
                await _dbService.AddAsync(entity);
                await _dbService.SaveChangesAsync();
            }

            return Ok();
        }

        [HttpGet("GetPage")]
        public async Task<ActionResult<PagedResult>> GetPage(int pageNumber, int pageSize)
        {
            var baseQuery = _dbService.DisplayRouteEntities
                .OrderBy(d => d.Id);

            var count = baseQuery.Count();

            var result = await baseQuery
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(result);
        }
    }
}
