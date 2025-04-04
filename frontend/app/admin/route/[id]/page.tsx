"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Edit2, Check, ChevronDown, PlusCircle, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { BusType, BusTypeLabels } from "@/lib/types"
import { routeApi } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth"

// Helper function to calculate fare array size
function calculateFareArraySize(numStops: number): number {
  return (numStops * (numStops - 1)) / 2;
}

// Helper function to get fare index
function getFareIndex(fromIndex: number, toIndex: number, totalStops: number): number {
  if (fromIndex >= toIndex) return -1;
  let index = 0;
  for (let i = 1; i < toIndex; i++) {
    index += i;
  }
  return index + fromIndex;
}

export default function RoutePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated } = useAuth()
  const routeId = params.id as string
  const isNewRoute = routeId === 'new'

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [routeNumber, setRouteNumber] = useState(searchParams.get("number") || "")
  const [routeName, setRouteName] = useState(searchParams.get("name") || "")
  
  // Parse bus types from URL or use default
  const [selectedBusTypes, setSelectedBusTypes] = useState<BusType[]>(() => {
    const busTypesParam = searchParams.get("busTypes")
    if (busTypesParam) {
      return busTypesParam.split(',') as BusType[]
    }
    return []
  })
  
  const [activeTab, setActiveTab] = useState<BusType | null>(selectedBusTypes.length > 0 ? selectedBusTypes[0] : null)
  const [locations, setLocations] = useState<{ [key in BusType]?: string[] }>({})
  const [fareMatrix, setFareMatrix] = useState<{ [key in BusType]?: number[] }>({})
  const [isEditingLocations, setIsEditingLocations] = useState(false)
  const [newLocation, setNewLocation] = useState("")
  const [addingAtIndex, setAddingAtIndex] = useState<number | null>(null)
  const [bulkStops, setBulkStops] = useState("")
  const [isEditingBusTypes, setIsEditingBusTypes] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [isEditingDetails, setIsEditingDetails] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/admin/login')
      return
    }
    if (!isNewRoute) {
      loadRoute()
    } else {
      setIsLoading(false)
    }
  }, [isAuthenticated, routeId])

  const loadRoute = async () => {
    try {
      const route = await routeApi.getOne(routeId)
      setRouteNumber(route.number)
      setRouteName(route.name)
      setSelectedBusTypes(route.busTypes)
      setLocations(route.locations || {})
      setFareMatrix(route.fareMatrix || {})
      setActiveTab(route.busTypes[0] || null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load route details",
        variant: "destructive"
      })
      router.push('/admin')
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize locations for each bus type
  useEffect(() => {
    const initialLocations: { [key in BusType]?: string[] } = {}
    const initialFareMatrix: { [key in BusType]?: number[] } = {}
    
    selectedBusTypes.forEach(type => {
      if (!locations[type]) {
        initialLocations[type] = []
        initialFareMatrix[type] = []
      }
    })
    
    setLocations(prev => ({ ...prev, ...initialLocations }))
    setFareMatrix(prev => ({ ...prev, ...initialFareMatrix }))
    
    if (activeTab === null || !selectedBusTypes.includes(activeTab)) {
      setActiveTab(selectedBusTypes.length > 0 ? selectedBusTypes[0] : null)
    }
  }, [selectedBusTypes])

  const getFare = (fromIndex: number, toIndex: number): string => {
    if (!activeTab) return "0";
    const fareIndex = getFareIndex(fromIndex, toIndex, locations[activeTab]?.length || 0);
    if (fareIndex === -1) return "0";
    const fare = (fareMatrix[activeTab] || [])[fareIndex];
    return fare !== undefined ? fare.toString() : "0";
  }

  const handleFareChange = (fromIndex: number, toIndex: number, value: string) => {
    if (!activeTab) return;
    
    const fareIndex = getFareIndex(fromIndex, toIndex, locations[activeTab]?.length || 0);
    if (fareIndex === -1) return;

    const numericValue = Number(value) || 0;
    
    setFareMatrix(prev => {
      const currentFares = [...(prev[activeTab] || [])];
      currentFares[fareIndex] = numericValue;
      return {
        ...prev,
        [activeTab]: currentFares
      };
    });
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const data = {
        number: routeNumber,
        name: routeName,
        busTypes: selectedBusTypes,
        locations,
        fareMatrix
      }

      if (isNewRoute) {
        await routeApi.create(data)
      } else {
        await routeApi.update(routeId, data)
      }

      toast({
        title: "Success",
        description: `Route ${isNewRoute ? 'created' : 'updated'} successfully`,
        duration: 3000,
        variant: "default"
      })

      if (isNewRoute) {
        router.push('/admin')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${isNewRoute ? 'create' : 'update'} route`,
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddLocation = (index: number | null) => {
    if (!activeTab) return;
    
    if (newLocation && !locations[activeTab]?.includes(newLocation)) {
      const updatedLocations = { ...locations }
      const currentLocations = updatedLocations[activeTab] || []
      
      if (index === null) {
        updatedLocations[activeTab] = [...currentLocations, newLocation]
      } else {
        updatedLocations[activeTab] = [
          ...currentLocations.slice(0, index),
          newLocation,
          ...currentLocations.slice(index),
        ]
      }

      // Update fare matrix size
      const newSize = calculateFareArraySize(updatedLocations[activeTab]!.length)
      const currentFares = fareMatrix[activeTab] || []
      const newFares = new Array(newSize).fill(0)
      
      // Copy existing fares
      for (let i = 0; i < Math.min(currentFares.length, newSize); i++) {
        newFares[i] = currentFares[i]
      }

      setLocations(updatedLocations)
      setFareMatrix(prev => ({
        ...prev,
        [activeTab]: newFares
      }))
      setNewLocation("")
      setAddingAtIndex(null)
    }
  }

  const handleRemoveLocation = (location: string) => {
    if (!activeTab) return;
    
    const updatedLocations = { ...locations }
    const currentLocations = updatedLocations[activeTab] || []
    const removeIndex = currentLocations.indexOf(location)
    
    updatedLocations[activeTab] = currentLocations.filter(loc => loc !== location)
    
    // Update fare matrix
    const newLocations = updatedLocations[activeTab] || []
    const newSize = calculateFareArraySize(newLocations.length)
    const newFares = new Array(newSize).fill(0)
    
    // Copy relevant fares
    for (let to = 1; to < newLocations.length; to++) {
      for (let from = 0; from < to; from++) {
        const oldTo = to + (to >= removeIndex ? 1 : 0)
        const oldFrom = from + (from >= removeIndex ? 1 : 0)
        const newIndex = getFareIndex(from, to, newLocations.length)
        const oldIndex = getFareIndex(oldFrom, oldTo, currentLocations.length)
        if (oldIndex !== -1 && newIndex !== -1) {
          newFares[newIndex] = (fareMatrix[activeTab] || [])[oldIndex]
        }
      }
    }

    setLocations(updatedLocations)
    setFareMatrix(prev => ({
      ...prev,
      [activeTab]: newFares
    }))
  }

  const handleBusTypeChange = (type: BusType, checked: boolean) => {
    if (checked) {
      setSelectedBusTypes(prev => [...prev, type])
    } else {
      setSelectedBusTypes(prev => prev.filter(t => t !== type))
      // Remove data for this bus type
      setLocations(prev => {
        const updated = { ...prev }
        delete updated[type]
        return updated
      })
      setFareMatrix(prev => {
        const updated = { ...prev }
        delete updated[type]
        return updated
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-6">Route: {routeName}</h1>
        
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Route Details</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                if (isEditingDetails) {
                  await handleSave();
                }
                setIsEditingDetails(!isEditingDetails);
              }}
            >
              {isEditingDetails ? <Check className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
              {isEditingDetails ? "Save" : "Edit"}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="routeNumber" className="block text-sm font-medium text-gray-700">
                Route Number
              </label>
              {isEditingDetails ? (
                <Input
                  id="routeNumber"
                  value={routeNumber}
                  onChange={(e) => setRouteNumber(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 py-2 px-3 bg-muted rounded-md text-sm">{routeNumber}</div>
              )}
            </div>
            <div>
              <label htmlFor="routeName" className="block text-sm font-medium text-gray-700">
                Route Name
              </label>
              {isEditingDetails ? (
                <Input
                  id="routeName"
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 py-2 px-3 bg-muted rounded-md text-sm">{routeName}</div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                if (isEditingBusTypes) {
                  await handleSave();
                }
                setIsEditingBusTypes(!isEditingBusTypes);
              }}
            >
              {isEditingBusTypes ? <Check className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
              {isEditingBusTypes ? "Save" : "Edit Bus Types"}
            </Button>
          </div>
          
          {isEditingBusTypes && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.values(BusType).map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-busType-${type}`}
                    checked={selectedBusTypes.includes(type)}
                    onCheckedChange={(checked) => handleBusTypeChange(type, !!checked)}
                  />
                  <Label htmlFor={`edit-busType-${type}`}>{BusTypeLabels[type]}</Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedBusTypes.length > 0 && (
          <>
            <div className="mb-4 flex space-x-2">
              {selectedBusTypes.map((type) => (
                <Button 
                  key={type} 
                  variant={activeTab === type ? "default" : "outline"} 
                  onClick={() => setActiveTab(type)}
                >
                  {BusTypeLabels[type]}
                </Button>
              ))}
            </div>

            {activeTab && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">Stops</h2>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditingLocations(!isEditingLocations)}>
                      {isEditingLocations ? <Check className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
                      {isEditingLocations ? "Save" : "Edit"}
                    </Button>
                    <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
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
                        <Button onClick={() => {
                          const newStops = bulkStops.split(',').map(s => s.trim()).filter(Boolean)
                          if (activeTab && newStops.length > 0) {
                            const updatedLocations = { ...locations }
                            updatedLocations[activeTab] = [...(updatedLocations[activeTab] || []), ...newStops]
                            setLocations(updatedLocations)
                            setBulkStops("")
                            setBulkDialogOpen(false)
                          }
                        }}>
                          Add Stops
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {locations[activeTab]?.map((location, index) => (
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
                  {isEditingLocations && (!locations[activeTab]?.length || addingAtIndex !== null) && (
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
                  {isEditingLocations && locations[activeTab]?.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingAtIndex(locations[activeTab]?.length || 0)}
                      className="p-0 w-6 h-6"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {activeTab && locations[activeTab]?.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40 text-right">To \ From</TableHead>
                      {locations[activeTab]?.slice(0, -1).map((location) => (
                        <TableHead key={location} className="w-40">
                          {location}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations[activeTab]?.slice(1).map((toLocation, rowIndex) => (
                      <TableRow key={toLocation}>
                        <TableCell className="font-medium text-right">{toLocation}</TableCell>
                        {locations[activeTab]?.slice(0, -1).map((fromLocation, colIndex) => (
                          <TableCell key={fromLocation}>
                            {colIndex <= rowIndex ? (
                              <Input
                                type="number"
                                value={getFare(colIndex, rowIndex + 1)}
                                onChange={(e) => handleFareChange(colIndex, rowIndex + 1, e.target.value)}
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
          </>
        )}

        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={isSaving || !routeNumber || !routeName || selectedBusTypes.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}

