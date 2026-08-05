using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;

#nullable disable

namespace ReactApp1.Server.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DirectionsResponseEntities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Uuid = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectionsResponseEntities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DisplayRouteEntities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Duration = table.Column<double>(type: "float", nullable: false),
                    Distance = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DisplayRouteEntities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RouteEntity",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RouteId = table.Column<int>(type: "int", nullable: false),
                    DirectionsResponseId = table.Column<int>(type: "int", nullable: false),
                    Distance = table.Column<double>(type: "float", nullable: true),
                    Duration = table.Column<double>(type: "float", nullable: true),
                    Weight = table.Column<double>(type: "float", nullable: true),
                    WeightName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Geometry = table.Column<LineString>(type: "geography", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteEntity", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RouteEntity_DirectionsResponseEntities_DirectionsResponseId",
                        column: x => x.DirectionsResponseId,
                        principalTable: "DirectionsResponseEntities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RouteLegEntity",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RouteEntityRouteId = table.Column<int>(type: "int", nullable: false),
                    RouteEntityId = table.Column<int>(type: "int", nullable: false),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Distance = table.Column<double>(type: "float", nullable: false),
                    Duration = table.Column<double>(type: "float", nullable: false),
                    Weight = table.Column<double>(type: "float", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteLegEntity", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RouteLegEntity_RouteEntity_RouteEntityId",
                        column: x => x.RouteEntityId,
                        principalTable: "RouteEntity",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WaypointEntity",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DirectionsResponseEntityId = table.Column<int>(type: "int", nullable: false),
                    RouteEntityId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Location = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Distance = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WaypointEntity", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WaypointEntity_DirectionsResponseEntities_DirectionsResponseEntityId",
                        column: x => x.DirectionsResponseEntityId,
                        principalTable: "DirectionsResponseEntities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WaypointEntity_RouteEntity_RouteEntityId",
                        column: x => x.RouteEntityId,
                        principalTable: "RouteEntity",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RouteEntity_DirectionsResponseId",
                table: "RouteEntity",
                column: "DirectionsResponseId");

            migrationBuilder.CreateIndex(
                name: "IX_RouteLegEntity_RouteEntityId",
                table: "RouteLegEntity",
                column: "RouteEntityId");

            migrationBuilder.CreateIndex(
                name: "IX_WaypointEntity_DirectionsResponseEntityId",
                table: "WaypointEntity",
                column: "DirectionsResponseEntityId");

            migrationBuilder.CreateIndex(
                name: "IX_WaypointEntity_RouteEntityId",
                table: "WaypointEntity",
                column: "RouteEntityId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DisplayRouteEntities");

            migrationBuilder.DropTable(
                name: "RouteLegEntity");

            migrationBuilder.DropTable(
                name: "WaypointEntity");

            migrationBuilder.DropTable(
                name: "RouteEntity");

            migrationBuilder.DropTable(
                name: "DirectionsResponseEntities");
        }
    }
}
