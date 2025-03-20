import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, redirect } from "react-router-dom";
import Swal from 'sweetalert2'

import { Container, Row, Col, Form, ListGroup, InputGroup, Button, Spinner } from 'react-bootstrap';

import { TbEngine, TbManualGearbox } from "react-icons/tb";
import { BsCarFront, BsFillCarFrontFill, BsFillFuelPumpFill } from "react-icons/bs";
import { PiEngineFill } from "react-icons/pi";

import { useDispatch, useSelector } from "react-redux";
import { makeReservation, reserveNow } from "../redux/features/ReserveSlice";

import { fetchBrands, fetchModels, fetchCars, fetchLocations } from "../hooks/useFetchData";

import { loadingContent } from "../components/general/general-components";

import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";

const CarDetail = () => {

    const dispatch = useDispatch();
    const user = useSelector(({ UserSlice }) => UserSlice.user);

    const { carBrand, carModel, carId } = useParams();
    const navigate = useNavigate();

    const [cars, setCars] = useState(null);
    const [brands, setBrands] = useState(null);
    const [models, setModels] = useState(null);
    const [locations, setLocations] = useState(null);

    const [selectedLocations, setSelectedLocations] = useState({ pickup: "", dropoff: "" });
    const [rentDate, setRentDate] = useState({ start: getDateByInputFormat(), end: getDateByInputFormat(1) });
    const [calculatedPrice, setCalculatedPrice] = useState(null);

    const [isReservationTimerEnable, setIsReservationTimerEnable] = useState(true);
    const [reservationTimer, setReservationTimer] = useState(300); //in seconds

    useEffect(() => {

        fetchBrands().then(response => setBrands(response));
        fetchModels().then(response => setModels(response));
        fetchCars().then(response => {
            setCars(response)
            setIsReservationTimerEnable(response[carId].carCount > 0)
        });
        fetchLocations().then(response => { setLocations(response) });

    }, []);


    function getDateByInputFormat(dayOffset = 0, date = null) {

        let currentDate = date === null ? new Date() : new Date(date)
        if (dayOffset === 0) return currentDate.toISOString().split('T')[0]

        const offsetDate = new Date(currentDate)
        offsetDate.setDate(currentDate.getDate() + dayOffset)
        return offsetDate.toISOString().split('T')[0]
    }
    function timerToString() {
        let hours = ('0' + Math.floor(reservationTimer / 3600)).slice(-2);
        let minutes = ('0' + Math.floor(reservationTimer / 60)).slice(-2);
        let seconds = ('0' + reservationTimer % 60).slice(-2);
        return /*hours + ":" +*/ minutes + ":" + seconds;
    }
    function handleReserveTimeout() {

        let redirectTimerInterval
        Swal.fire({
            title: 'You did not complete the reservation!',
            html:
                'You are being redirected in <strong>5</strong> seconds',
            timer: 5000,
            didOpen: () => {
                const content = Swal.getHtmlContainer()
                const $ = content.querySelector.bind(content)

                Swal.showLoading()

                redirectTimerInterval = setInterval(() => {
                    Swal.getHtmlContainer().querySelector('strong')
                        .textContent = (Swal.getTimerLeft() / 1000)
                            .toFixed(0)
                }, 100)
            },
            willClose: () => {
                clearInterval(redirectTimerInterval);
                navigate("/")
            }
        })
    }

    useEffect(() => {
        if (!isReservationTimerEnable) return;

        if (reservationTimer > 0) {
            setTimeout(() => {
                setReservationTimer(reservationTimer - 1);
            }, 1000)
        }
        else {
            handleReserveTimeout()
        }
    }, [reservationTimer]);

    const calculateTotalPrice = () => {
        if (!cars || !rentDate.start || !rentDate.end) return;
        
        const startDate = new Date(rentDate.start);
        const endDate = new Date(rentDate.end);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        const dailyRate = cars[carId].rental_price || 0;
        const totalPrice = daysDiff * dailyRate;
        
        setCalculatedPrice(totalPrice);
        return totalPrice;
    };

    const handleReserveButtonClick = async event => {
        if (!calculatedPrice) {
            Swal.fire({ 
                title: "Please calculate the price first!", 
                icon: "warning" 
            });
            return;
        }

        if (!user.email) {

            Swal.fire({
                title: "You have to log in",
                text: "Please log in for reservation",
                icon: "info",
                showConfirmButton: true
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate("/login")
                }
            });
        }
        else {

            if (Object.values(selectedLocations).some(value => value === "")) {

                let resultContent = Object.values(selectedLocations).every(value => value === "")
                    ? "Please choose locations!"
                    : selectedLocations.pickup === ""
                        ? "Please choose pick-up location!"
                        : "Please choose drop-off location!"

                Swal.fire({ title: resultContent, icon: "warning" });

                return;
            }

            event.currentTarget.disabled = true;
            setIsReservationTimerEnable(false);

            const reservationData = {
                reservationOwner: user.email,
                carId: parseInt(carId) || 0,
                carBrand: carBrand,
                carModel: carModel,
                startDate: rentDate.start,
                endDate: rentDate.end,
                pickupLocation: parseInt(selectedLocations.pickup) || 0,
                dropoffLocation: parseInt(selectedLocations.dropoff) || 0,
                totalPrice: calculatedPrice
            }

            const carsClone = Object.assign({}, cars);
            carsClone[carId].carCount = carsClone[carId].carCount - 1;

            setDoc(doc(db, "vehicle", "cars"), carsClone);
            addDoc(collection(db, "rentals"), reservationData)
                .then(() => {

                    Swal.fire(
                        'Reservation Completed!',
                        'Car has been reserved for you!',
                        'success'
                    )
                })
                .catch(err => {
                    console.log(err);
                    Swal.fire({
                        icon: "error",
                        title: "Oops...",
                        text: "Something went wrong!"
                    });
                });


            // IT WAS USING BEFORE DATABASE USAGE (FOR GLOBAL STATE MANAGEMENT)
            //
            // dispatch(makeReservation(reservationData));
            //
            // NOT REQUIRED ANYMORE (BECAUSE RESERVATION DATA WILL FETCH FROM DB)
        }
    }

    return (
        <div id="car-detail" style={{ clear: "both" }}>
            <Container className="py-4">
                <Row className="mb-5">
                    <Col>
                        {
                            isReservationTimerEnable &&
                            <h1 className="fs-1 text-center text-uppercase">Complete your reservation in <b>{timerToString()}</b></h1>
                        }
                    </Col>
                </Row>
                {
                    cars && brands && models && locations
                        ?
                        <>
                            <Row className="mb-4">
                                <Col xs={12} md={6}>
                                    <LazyLoadImage
                                        src={cars[carId].image}
                                        className="img-fluid"
                                        effect="blur"
                                        alt={`${carBrand} / ${carModel}`}
                                    />
                                </Col>
                                <Col xs={12} md={6}>
                                    <ListGroup variant="flush">
                                        <ListGroup.Item variant="secondary" action>
                                            <BsFillCarFrontFill size="2em" className="me-2" style={{ marginTop: "-10px" }} />
                                            <span className="fs-6">Brand & Model:</span> &nbsp;
                                            <span className="fs-5 fw-bold">{`${carBrand} / ${carModel}`}</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item action>
                                            <TbEngine size="2em" className="me-2" style={{ marginTop: "-8px" }} />
                                            <span className="fs-6">HP:</span> &nbsp;
                                            <span className="fs-5 fw-bold">{cars[carId].power}</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item action>
                                            <PiEngineFill size="2em" className="me-2" style={{ marginTop: "-8px" }} />
                                            <span className="fs-6">Engine Size:</span> &nbsp;
                                            <span className="fs-5 fw-bold">{cars[carId].engineSize}</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item action>
                                            <TbManualGearbox size="2em" className="me-2" style={{ marginTop: "-8px" }} />
                                            <span className="fs-6">Gear Box:</span> &nbsp;
                                            <span className="fs-5 fw-bold">{cars[carId].gearbox}</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item action>
                                            <BsCarFront size="2em" className="me-2" style={{ marginTop: "-10px" }} />
                                            <span className="fs-6">Body Type:</span> &nbsp;
                                            <span className="fs-5 fw-bold">{cars[carId].bodyType}</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item action>
                                            <BsFillFuelPumpFill size="2em" className="me-2" style={{ marginTop: "-10px" }} />
                                            <span className="fs-6">Fuel Type:</span> &nbsp;
                                            <span className="fs-5 fw-bold">{cars[carId].fuelType}</span>
                                        </ListGroup.Item>
                                        <ListGroup.Item action>
                                            <span className="fs-6">Rental Price:</span> &nbsp;
                                            <span className="fs-5 fw-bold">₹{cars[carId].rental_price ? cars[carId].rental_price.toLocaleString('en-IN') : '0'}/day</span>
                                        </ListGroup.Item>
                                    </ListGroup>

                                    <div className="text-end">
                                        <span className={`text-secondary fst-italic ${cars[carId].carCount > 0 ? "text-success" : "text-danger"}`}>
                                            Available Stock: {cars[carId].carCount}
                                        </span>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col xs={12} md={6}>
                                    <Form>
                                        <Row>
                                            <Col xs={12} md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Pick-up Location</Form.Label>
                                                    <Form.Select
                                                        value={selectedLocations.pickup}
                                                        onChange={e => setSelectedLocations(prev => ({ ...prev, pickup: e.target.value }))}
                                                    >
                                                        <option value="">Select Pick-up Location</option>
                                                        {
                                                            cars[carId].availableLocations.map(locationId =>
                                                                <option key={`pickup_${locationId}`} value={locationId}>
                                                                    {locations[locationId]}
                                                                </option>
                                                            )
                                                        }
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                            <Col xs={12} md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Drop-off Location</Form.Label>
                                                    <Form.Select
                                                        value={selectedLocations.dropoff}
                                                        onChange={e => setSelectedLocations(prev => ({ ...prev, dropoff: e.target.value }))}
                                                    >
                                                        <option value="">Select Drop-off Location</option>
                                                        {
                                                            cars[carId].availableLocations.map(locationId =>
                                                                <option key={`dropoff_${locationId}`} value={locationId}>
                                                                    {locations[locationId]}
                                                                </option>
                                                            )
                                                        }
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col xs={12} md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Start Date</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={rentDate.start}
                                                        min={getDateByInputFormat()}
                                                        onChange={e => {
                                                            setRentDate(prev => ({ ...prev, start: e.target.value }));
                                                            setCalculatedPrice(null);
                                                        }}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col xs={12} md={6}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>End Date</Form.Label>
                                                    <Form.Control
                                                        type="date"
                                                        value={rentDate.end}
                                                        min={rentDate.start}
                                                        onChange={e => {
                                                            setRentDate(prev => ({ ...prev, end: e.target.value }));
                                                            setCalculatedPrice(null);
                                                        }}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row className="mb-3">
                                            <Col xs={12} md={6}>
                                                <Button 
                                                    variant="info" 
                                                    className="w-100"
                                                    onClick={calculateTotalPrice}
                                                    disabled={!rentDate.start || !rentDate.end}
                                                >
                                                    Calculate Price
                                                </Button>
                                            </Col>
                                            <Col xs={12} md={6}>
                                                {calculatedPrice !== null && (
                                                    <div className="alert alert-info mb-0 text-center">
                                                        <strong>Total Price: ₹{calculatedPrice.toLocaleString('en-IN')}</strong>
                                                    </div>
                                                )}
                                            </Col>
                                        </Row>
                                        <Row>
                                            <Col>
                                                <Button
                                                    variant="success"
                                                    className="w-100"
                                                    onClick={handleReserveButtonClick}
                                                    disabled={!isReservationTimerEnable || cars[carId].carCount === 0 || calculatedPrice === null}
                                                >
                                                    Reserve Now!
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Form>
                                </Col>
                            </Row>
                        </>
                        :
                        loadingContent
                }
            </Container>
        </div>
    )
};

export default CarDetail;