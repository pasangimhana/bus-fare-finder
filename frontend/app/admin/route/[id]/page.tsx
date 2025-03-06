"use client"

import { useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Edit2, Check, ChevronDown, PlusCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

const busTypes = ["Luxury", "Semi-Luxury", "Expressway", "AC"]

export default function RoutePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const routeId = params.id
  const [activeTab, setActiveTab] = useState(busTypes[0])
  const [routeNumber, setRouteNumber] = useState(searchParams.get("number") || "")
  const [routeName, setRouteName] = useState(searchParams.get("name") || "")
  const [locations, setLocations] = useState<{ [key: string]: string[] }>({
    Luxury: [],
    "Semi-Luxury": [],
    Expressway: [],
    AC: [],
  })
  const [fares, setFares] = useState<{ [key: string]: { [key: string]: number } }>({})
  const [isEditingLocations, setIsEditingLocations] = useState(false)
  const [newLocation, setNewLocation] = useState("")
  const [addingAtIndex, setAddingAtIndex] = useState<number | null>(null)
  const [bulkStops, setBulkStops] = useState("")

  const handleFareChange = (from: string, to: string, value: string) => {
    setFares((prev) => ({
      ...prev,
      [`${from}-${to}`]: {
        ...prev[`${from}-${to}`],
        [activeTab]: Number.parseInt(value) || 0,
      },
    }))
  }

  const getFare = (from: string, to: string): string => {
    return (fares[`${from}-${to}`]?.[activeTab] || "").toString()
  }

  const handleSave = () => {
    console.log("Saving route:", { routeNumber, routeName, locations, fares })
    alert("Route saved successfully!")
  }

  const handleAddLocation = (index: number | null) => {
    if (newLocation && !locations[activeTab].includes(newLocation)) {
      const updatedLocations = { ...locations }
      if (index === null) {
        updatedLocations[activeTab] = [...updatedLocations[activeTab], newLocation]
      } else {
        updatedLocations[activeTab] = [
          ...updatedLocations[activeTab].slice(0, index),
          newLocation,
          ...updatedLocations[activeTab].slice(index),
        ]
      }
      setLocations(updatedLocations)
      setNewLocation("")
      setAddingAtIndex(null)
    }
  }

  const handleRemoveLocation = (location: string) => {
    const updatedLocations = { ...locations }
    updatedLocations[activeTab] = updatedLocations[activeTab].filter((loc) => loc !== location)
    setLocations(updatedLocations)
  }

  const handleAddBulkStops = () => {
    const newStops = bulkStops
      .split(",")
      .map((stop) => stop.trim())
      .filter((stop) => stop !== "")
    const updatedLocations = { ...locations }
    updatedLocations[activeTab] = [...updatedLocations[activeTab], ...newStops]
    setLocations(updatedLocations)
    setBulkStops("")
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-6">Route: {routeName}</h1>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="routeNumber" className="block text-sm font-medium text-gray-700">
              Route Number
            </label>
            <Input
              id="routeNumber"
              value={routeNumber}
              onChange={(e) => setRouteNumber(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="routeName" className="block text-sm font-medium text-gray-700">
              Route Name
            </label>
            <Input id="routeName" value={routeName} onChange={(e) => setRouteName(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div className="mb-4 flex space-x-2">
          {busTypes.map((type) => (
            <Button key={type} variant={activeTab === type ? "default" : "outline"} onClick={() => setActiveTab(type)}>
              {type}
            </Button>
          ))}
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Stops for {activeTab}</h2>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditingLocations(!isEditingLocations)}>
                {isEditingLocations ? <Check className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
                {isEditingLocations ? "Save" : "Edit"}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Add Bulk
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Bulk Stops</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    placeholder="Enter comma-separated stops"
                    value={bulkStops}
                    onChange={(e) => setBulkStops(e.target.value)}
                  />
                  <Button onClick={handleAddBulkStops}>Add Stops</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations[activeTab].map((location, index) => (
              <div
                key={location}
                className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm flex items-center"
              >
                {location}
                {isEditingLocations && (
                  <>
                    <button
                      onClick={() => handleRemoveLocation(location)}
                      className="ml-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="ml-1 text-muted-foreground hover:text-primary">
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => setAddingAtIndex(index)}>Add stop before</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setAddingAtIndex(index + 1)}>Add stop after</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))}
            {isEditingLocations && (locations[activeTab].length === 0 || addingAtIndex !== null) && (
              <div className="flex items-center">
                <Input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="New stop"
                  className="w-32 h-8 text-sm"
                />
                <Button variant="ghost" size="sm" onClick={() => handleAddLocation(addingAtIndex)} className="ml-1">
                  <Check className="h-4 w-4" />
                </Button>
                {addingAtIndex !== null && (
                  <Button variant="ghost" size="sm" onClick={() => setAddingAtIndex(null)} className="ml-1">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {isEditingLocations && locations[activeTab].length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddingAtIndex(locations[activeTab].length)}
                className="p-0 w-6 h-6"
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {locations[activeTab].length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 text-right">To \ From</TableHead>
                  {locations[activeTab].slice(0, -1).map((location) => (
                    <TableHead key={location} className="w-40">
                      {location}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations[activeTab].slice(1).map((toLocation, rowIndex) => (
                  <TableRow key={toLocation}>
                    <TableCell className="font-medium text-right">{toLocation}</TableCell>
                    {locations[activeTab].slice(0, -1).map((fromLocation, colIndex) => (
                      <TableCell key={fromLocation}>
                        {colIndex <= rowIndex ? (
                          <Input
                            type="number"
                            value={getFare(fromLocation, toLocation)}
                            onChange={(e) => handleFareChange(fromLocation, toLocation, e.target.value)}
                            className="w-20"
                          />
                        ) : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </Card>
    </div>
  )
}

