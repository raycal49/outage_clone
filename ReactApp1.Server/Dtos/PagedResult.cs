namespace ReactApp1.Server.Dtos
{
    public class PagedResult
    {
        public PagedResult(List<Route> r, int c, int num, int size)
        {
            this.routes = r;
            this.pageNumber = num;
            this.pageSize = size;
            this.totalRoutes = c;
        }

        public List<Route> routes { get; set; } = new List<Route>();
        public int totalRoutes { get; set; }
        public int pageNumber { get; set; }
        public int pageSize { get; set; }
        public int totalPages => (int)Math.Ceiling((double)totalRoutes / pageSize);
        public bool hasNext => pageNumber < totalPages;
        public bool hasPrevious => pageNumber > 1;
    }
}