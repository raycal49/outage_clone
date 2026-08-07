import React, { useEffect, useState } from 'react';
import ReactPaginate from 'react-paginate';
import type { LineString } from 'geojson';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import './Dashboard.css'

interface leg {
    summary: string;
    distance: number;
    duration: number;
    weight: number;
}

interface route {
    distance: number;
    duration: number;
    weight: number;
    weightname: string;
    geometry: LineString
    legs: leg[]
}

interface displayRouteDto {
    id: number,
    name: string,
    distance: number,
    duration: number
};

function Dashboard() {
    const [routes, setRoutes] = useState<displayRouteDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRoutes, setTotalRoutes] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [routesPerPage, setRoutesPerPage] = useState(5);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);

            const res = await fetch(`/Dashboard/GetPage?pageNumber=${currentPage}&pageSize=${routesPerPage}`);

            const data = await res.json();

            setRoutes(data);

            setTotalRoutes(data.totalRoutes);

            setTotalPages(data.totalPages);

            setLoading(false);
        };

        fetchPosts();
    }, [currentPage, routesPerPage]);

    const handleClick = (e: { selected: number }) => {
        setCurrentPage(e.selected + 1)
    };

    return (
        <div className="container">
            <h1 className="my-5">Blog Posts</h1>
            {loading ? <p>Loading...</p> : <RouteList displayRoutes ={routes} />}
            <ReactPaginate
                previousLabel={"<"}
                nextLabel=">"
                breakLabel=". . ."
                pageCount={ 5 }
                marginPagesDisplayed={2}
                pageRangeDisplayed={3}
                onPageChange={handleClick}
                containerClassName={"pagination"}
                pageLinkClassName="page-link"
                previousLinkClassName="page-link"
                nextLinkClassName="page-link"
                activeClassName={"active"}
                disabledClassName={"disabled"}
            />
        </div>
    );
}

type DisplayRouteListProps = { displayRoutes: displayRouteDto[]}

const RouteList = ({ displayRoutes = [] }: DisplayRouteListProps) => {

    return (
        <ul className="list-group mb-4">
            {displayRoutes.map((displayRoute) => (
                <li key={displayRoute.id} className="list-group-item">
                    <p>{displayRoute.name}</p>
                    <p>{displayRoute.duration}</p>
                    <p>{displayRoute.distance}</p>
                </li>
            ))}
        </ul>
    );
}

export default Dashboard;