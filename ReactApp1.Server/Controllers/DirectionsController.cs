using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Dtos;
using ReactApp1.Server.Infrastructure.Http;

namespace ReactApp1.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class DirectionsController : ControllerBase
    {
        private readonly IDirectionsService _directionsService;

        public DirectionsController(IDirectionsService directionsService)
        {
            _directionsService = directionsService;
        }

        [HttpGet("Directions")]
        public async Task<ActionResult<DirectionsResponseDto>> GetDirections(string coordinates)
        {
            var directions = await _directionsService.GetDirections(coordinates);

            return Ok(directions);
        }
    }
}
