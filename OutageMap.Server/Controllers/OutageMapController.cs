using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Features;
using OutageMap.Server.Infrastructure.Http;
using OutageMap.Server.Services;

namespace OutageMap.Server.Controllers;

[Route("[controller]")]
[ApiController]
public class OutageMapController : ControllerBase
{
    private readonly IOutageReader _outageReader;

    public OutageMapController(IOutageReader outageReader)
    {
        _outageReader = outageReader;
    }

    [HttpGet("OutageData")]
    public async Task<ActionResult> GetOutageData(CancellationToken cancellationToken)
    {
        var outages = await _outageReader.GetActiveOutages(cancellationToken);

        return Ok(outages);
    }

}
