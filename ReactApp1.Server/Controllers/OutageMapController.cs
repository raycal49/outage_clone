using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ReactApp1.Server.Infrastructure.Http;

using static ReactApp1.Server.Models.GeoJsonConversions;

namespace ReactApp1.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class OutageMapController : ControllerBase
    {
        private readonly IOutageService _outageService;

        public OutageMapController(IOutageService outageService)
        {
            _outageService = outageService;
        }

        [HttpGet("OutageData")]
        public async Task<ActionResult> GetOutageData()
        {
            var outageDto = await _outageService.GetOutageData();

            var outageGeoJson = ConvertToFeatureCollection(outageDto);

            return Ok(outageGeoJson);
        }

    }
}
