const express = require('express');

const router = express.Router();

const {Spot, Review,sequelize,ReviewImage,SpotImage, User,Booking} = require('../../db/models');
const { Op } = require("sequelize");
const { requireAuth,restoreUser, setTokenCookie } = require('../../utils/auth');

router.get('/:spotId/bookings', requireAuth,async (req, res)=>{
    const spotid = req.params.spotId;
    const {user} = req;
    const foundBooking = await Booking.findOne({
        where:{
            spotId:Number(spotid)
        },
        // limit:1
    });
    // res.json(foundBooking);
  
    if(user.id !== foundBooking.userId){
        res.status(200);
        return res.json({
            foundBooking 
        })
    }
    if(user.id === foundBooking.userId) {
        const theuser = await User.findByPk(user.id);
        res.status(200);
        return res.json({
            "Bookings":[
                {
                    "User":theuser,
                  ...foundBooking.toJSON()  
                }
            ]
        })
    }
 

})

router.get('/:spotId/reviews', async (req, res)=>{
    const spotid = req.params.spotId;
    const foundReviews = await Review.findAll({
        where:{
            spotId:Number(spotid)
        },
        include:[
            {
                model:User
            },
            {
                model:ReviewImage
            }
        ]
    });
    if(foundReviews.length>0){
        res.status(200)
        return res.json({
           "Reviews":foundReviews
        })
    }

    res.status(404);
    res.json({
        "message": "Spot couldn't be found"
      });
   
})


router.get('/current', async (req, res)=>{
    
    // console.log(secretKey);
    const { user } = req;
    // console.log(user);
  
  
    if(user){

      
        const foundSpot = await Spot.findAll({
           where:{
            ownerId: user.id
           }
        });
    //    const foundReviewsCount = await Review.count({
    //     where: {spotId:foundSpot.id}
    //    });

    if(!foundSpot[0]) {
        res.setHeader('Content-Type','application/json');
        res.status(401);
        return res.json(user)
    }

    let results = [];

    for (let foundSpotEl of foundSpot){

        const foundAverageStars = await Review.findOne({
            attributes: [
               [sequelize.fn('AVG', sequelize.col('stars')), 'avgStarRating']
            ],
            where: {
               spotId: foundSpotEl.id
            }
         });
         
             let newfoundspot = foundSpotEl.toJSON();
             newfoundspot['avgRating'] = foundAverageStars? foundAverageStars.toJSON().avgStarRating :null;
         
         // console.log(foundAverageStars);
         
            const foundSpotImg = await SpotImage.findOne({
             where:{
                 spotId: foundSpotEl.id
             }
            });
             
            console.log(foundSpotImg);
         //    newfoundspot['previewImage'] = foundSpotImg?foundSpotImg.toJSON().previewImage:null;
         // console.log(foundSpotImg)
             // newfoundspot['previewImage'] = null;
             if(foundSpotImg){
                 newfoundspot['previewImage'] =foundSpotImg.toJSON().url;
             }else{
                 newfoundspot['previewImage'] = null;
             }

             results.push( newfoundspot);
    }
  

      res.setHeader('Content-Type','application/json');
      res.json({
         "Spots":  results   
      });
  
      }
      else{
        res.setHeader('Content-Type','application/json');
        res.status(401);
        return res.json(user)
    }
    
    return res.json(user)
  })

//   DROP SCHEMA snake_case CASCADE;
router.get('/:spotId', async (req,res)=>{

    const spotid = req.params.spotId;
    console.log('======>',spotid);

    const foundSpot = await Spot.findByPk(Number(spotid));
    if(!foundSpot){
        res.status(404);
        res.setHeader('Content-Type','application/json');
        return res.json({
            "message": "Spot couldn't be found"
          })
    }
    const foundOwener = await User.findOne({
        attributes:['id', 'firstName', 'lastName'],
        where:{
            id:foundSpot.ownerId
        }
    });
    const foundSpotImage = await SpotImage.findAll({
        attributes:['id','url','preview'],
        where:{
            spotId:foundSpot.id
        }
    });
    const foundReview = await Review.findAll({
        attributes: [
            [sequelize.fn('AVG', sequelize.col('stars')), 'avgStarRating']
         ],
         where: {
            spotId: foundSpot.id
         }
    })
    const foundReviewSecond = await Review.findAll({
        where: {
            spotId: foundSpot.id
         }
    })
    const avgStarRating = foundReview[0].toJSON()


 

    res.status(200);
    res.setHeader('Content-Type','application/json');
    res.json({
        ...foundSpot.toJSON(),
        "Owner":foundOwener,
        "SpotImages":foundSpotImage,
        ...avgStarRating,
        'numReviews': foundReviewSecond.length
    })
    
})



router.get('/', async (req, res)=>{


    // const { user } = req;
    // console.log(user);
    const page = req.query.page || 1;
    const size = req.query.size || 20;
    const offset = (Number(page)-1)*Number(size);
    let where = {};
    const minLat = req.query.minLat||-90;
    const maxLat = req.query.maxLat||90;
    const minLng = req.query.minLng||-180;
    const maxLng = req.query.maxLng||180;
    const minPrice = req.query.minPrice||0;
    const maxPrice = req.query.maxPrice||30000;

    if(typeof page === "string") {
        const pageSplit = page.split('');
        pageSplit.forEach(el=>{
            if(!'0123456789'.includes(el)){
                res.status(400);
                return res.json({
                    "message":"wrong query",
                    "errors":{
                        page,
                        size
                }
                })
            }
        })
    }

    if(typeof minLat === 'string'){
        const minlatSplit = minLat.split('');
        minlatSplit.forEach(el=>{
            if(!'0123456789'.includes(el)){

                res.status(400);
        return res.json({
            "message":"wrong query",
            "errors":{
            minLat,
            maxLat,
            minLng,
            maxLng
        },
            
        })
                
            }
        })
    }
   
    if(Number(minLat)<-90||Number(maxLat)>90||Number(minLng)<-180||Number(maxLng)>180) {
        res.status(400);
        return res.json({
            "message":"wrong query",
            "errors":{
            minLat,
            maxLat,
            minLng,
            maxLng}
        })
    }

    console.log(minLat, maxLat,typeof minLat );

    // if(minLat) {
    //      where.lat ={
    //         [Op.gte] : Number(minLat)
    //      }
        
    // }
   
    // if(maxLat) where.lat={
    //     [Op.lte] : Number(minLng)
    // }
    // if(minLng) where.Lng ={
    //     [Op.gte]: Number(minLng)
    // }
    // if(maxLng) where.Lng ={
    //      [Op.lte] : Number(maxLng)
    // }
    // if(minPrice) where.price = {
    //     [Op.gte] :Number(minPrice)
    // }
    // if(maxPrice) where.price ={
    //     [Op.lte]: Number(maxPrice)
    // }
  

    // console.log(where);

    const findSpot = await Spot.findAll({
        attributes:['id','ownerId','address','city','state','country','lat','lng','name', 'description','price','createdAt','updatedAt'],
        where:{
            lat:{
                [Op.between]: [Number(minLat), Number(maxLat)]
            },
            lng:{
                [Op.between]: [Number(minLng), Number(maxLng)]
            },
            price:{
                [Op.between]: [Number(minPrice), Number(maxPrice)]
            }
        },
        limit:Number(size),
        offset,
    });

    console.log(findSpot);

    if(findSpot.length === 0) {
     
        res.status(404);
        res.setHeader('Content-Type','application/json');
        return res.json({
             "message": "Spot couldn't be found"
        })
    }

    let results = [];
   

    for (let findSpotel of findSpot){
        let findSpotelObj =findSpotel.toJSON();
        const foundReviews = await Review.findAll({
            attributes:[[sequelize.fn('AVG',sequelize.col('stars')),'avgRating']],
            where:{
                spotId:findSpotel.id
            },
            // group: ['spotId']
        })
        // console.log(foundReviews[0].toJSON(). avgRating)
        findSpotelObj['avgRating'] = foundReviews[0].toJSON().avgRating? foundReviews[0].toJSON().avgRating:null;

        // console.log(findSpotelObj);

        const foundSpotImage = await SpotImage.findOne({
            attributes:['url'],
            where:{
                spotId:findSpotel.id
            }
        });

        findSpotelObj['previewImage'] =foundSpotImage? foundSpotImage.toJSON():null;
        findSpotelObj['page'] =page;
        findSpotelObj['size'] =size;
        results.push(findSpotelObj);
        
    }

    // const findSpot = await Spot.findAll({
    //     attributes:['id','ownerId','address','city','state','country','lat','lng','name', 'description','price','createdAt','updatedAt'],
    //     where,
       
    //     include:[{
    //         model:Review,
    //         attributes:[[sequelize.fn('AVG',sequelize.col('stars')),'avgRating']],
    //     },
    //     {
    //        model: SpotImage ,
    //        as:'previewImage',
    //        attributes:['url'],
         
    //     }],

    //     group: ['Spot.id'],
    //     limit:Number(size),
    //     offset,
    //     raw: true, 
    //     nest: true  
    // });

    // let newSpot=[];
    // for (let thespot of findSpot){
    //     const {Reviews,...rest} =thespot;
    //     newSpot.push({
    //         ...rest,
    //         "avgRating":Reviews.avgRating
    //     })
    // }

    res.setHeader("Content-Type","application/json");
    res.status(200);
    // res.json({"Spots":newSpot,
    //     page,
    //     size
    // });
    // console.log( results)
    res.json({
        "Spots":results,
            page,
        size
    })
});



router.post('/:spotId/images',async (req,res)=>{
    const {user} = req;
    if(!user){
        res.status(401);
        return res.json({"message":'Authentication required'});
    }

    const userSpot = await Spot.findOne({
        where:{
            ownerId:user.id
        }
    })
    if (!userSpot) {
        res.status(403);
        return res.json({
            "message":"you don't have a spot"
        })
    }

    const spotid = req.params.spotId;
    const {url,preview} = req.body;
 
   const spotidSplit =spotid.split('');
//    console.log('=>',spotid,spotidSplit);
   spotidSplit.forEach(el=>{
        console.log(el);
        if(!'0123456789'.includes(el)){
            res.status(403);
            return res.json({
                "message":`${spotid}`
            })
        }
});
   
  
    const foundSpot = await Spot.findByPk(Number(spotid));
    if (!foundSpot) {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found"
        })
    }

  
    if(foundSpot.ownerId !== user.id) {
        res.status(403);
        return res.json({
            "message":`it is not your spot, your spot is ${userSpot.id}`
        })
    }
   
   try{
    const newSpotImg = await SpotImage.create({"spotId":Number(spotid),url,preview});
    res.setHeader("Content-Type","application/json");
    res.status(201);
   return  res.json(newSpotImg)

   }   catch (error){
    // if (!newSpotImg) {
        res.status(404);
        return res.json(error);
        // return res.json({
        //     "message": "Spot couldn't be found"
        // })
    // }
   } 
        

})

router.use(restoreUser);

router.post('/:spotId/bookings', requireAuth,async (req, res)=>{
    const spotid = req.params.spotId;
    const {startDate,endDate} = req.body;
    const {user} = req;
    const foundSpot = await Spot.findByPk(Number(spotid));

    if(!foundSpot) {
        res.status(404);
        return res.json({
            "message": "Spot couldn't be found"
          })
    }

    if(foundSpot.ownerId === user.id) {
        res.status(200);
        return res.json({
          "message":"the Spot is the owner's, choose another one"
        })
    }
    try{
        const newBooking = await Booking.create({
            "spotId":Number(spotid),"userId":user.id,startDate,endDate
        });

        res.status(201);
        res.json(newBooking)
    }
    catch(error){

        if(error.original.code ==="SQLITE_CONSTRAINT"){
            res.status(403);
            return res.json({
                
                    "message": "Sorry, this spot is already booked for the specified dates",
                    "errors": {
                      "startDate": "Start date conflicts with an existing booking",
                      "endDate": "End date conflicts with an existing booking"
                    }
                  
            })
        }
        res.status(400);

        // return res.json(error.original.code)
        return res.json(
            {
                "message": "Bad Request", 
                "errors": {
                  "startDate": "startDate cannot be in the past",
                  "endDate": "endDate cannot be on or before startDate"
                }
              }
        )
    }
   

})



router.post('/:spotId/reviews', async (req,res)=>{
    const {user} = req;
    if(!user){
        res.status(401);
        return res.json({
         "message": "havent log in"
       })
     }
   
        const {review, stars} = req.body;
        const spotid = req.params.spotId;

        spotid.split("").forEach(el=>{
            if(!'0123456789'.includes(el)){
                res.status(404);
                return res.json({
                  "message": "Spot couldn't be found"
                });
              }
        })
        const foundSpot = await Spot.findOne({
            where:{
                id:Number(spotid)
            },
            include:{
                model:Review
            }
        });
        if(!foundSpot){
            res.status(404);
                return res.json({
                  "message": "Spot couldn't be found"
                });
        }

        console.log('==>',foundSpot);

        if(!review || !stars){
            res.status(400);
          
            return res.json(
                {
                    "message": "Bad Request", 
                    "errors": {
                      "review": "Review text is required",
                      "stars": "Stars must be an integer from 1 to 5",
                    }
                  }
            )
        }
    //   console.log("foundSpot.review",foundSpot.review);

        foundSpot.Reviews.forEach(el=>{
            if(el.userId===user.id) {
     res.status(500);
                return res.json({
                      "message":
            "User already has a review for this spot"})
            }
        })
           
            
  
            const newReview = await Review.create({
                "userId":user.id,"spotId":Number(spotid),review, stars
            });
            res.status(201);
            res.setHeader("Content-Type","application/json")
            return res.json(
                newReview 
            )
           
           

})

router.post('/',requireAuth,async (req, res)=>{

    try{
        const {address, city, state, country, lat, lng, name,description, price} = req.body;

        // console.log(req.user);
        
        const newSpot = await Spot.create({
            address, city, state, country, lat, lng, name,description, price,'ownerId':req.user.id
        });
            
      
        // await setTokenCookie(res, safeUser);
        res.status(201);
        return res.json(newSpot);
    }
    catch(error){
        res.status(400);
        res.json({
          "message": "Bad Request", 
          "errors": { 
              "address": "Street address is required",
              "city": "City is required",
              "state": "State is required",
              "country": "Country is required",
              "lat": "Latitude must be within -90 and 90",
              "lng": "Longitude must be within -180 and 180",
              "name": "Name must be less than 50 characters",
              "description": "Description is required",
              "price": "Price per day must be a positive number"
          }
        })
    }
    
});



router.put('/:spotId', async (req, res)=>{

    const {user} = req;
    if(!user){
          res.status(401);
          return res.json({
            "message":"you haven't log in"
          })
    }

     const spodid = req.params.spotId;
    
   
    try{
        const {address, city, state, country,lat,lng,name,description,price}=req.body;
        const theSpot = await Spot.findByPk(spodid);
        if(!theSpot) {
            res.status(404);
            return res.json({
                "message": "Spot couldn't be found"
              })
        }
        if(theSpot.ownerId !== user.id){
            res.status(403);
            return res.json({
                'message':"it is not your spot"
            })
        }

        if (name.length>50 || lat<-90||lat>90||lng<-180||lng>180){
            res.status(400);
        return res.json({
            "message": "Bad Request", 
            "errors": {
              "address": "Street address is required",
              "city": "City is required",
              "state": "State is required",
              "country": "Country is required",
              "lat": "Latitude must be within -90 and 90",
              "lng": "Longitude must be within -180 and 180",
              "name": "Name must be less than 50 characters",
              "description": "Description is required",
              "price": "Price per day must be a positive number"
            }
          })
        }
        if(address) theSpot.address=address;
        if(city) theSpot.city=city;
        if(country) theSpot.country=country;
        if(state) theSpot.state = state;
        if(lat) theSpot.lat =lat;
        if(lng) theSpot.lng =lng;
        if(name) theSpot.name =name;
        if(description) theSpot.description=description;
        if(price) theSpot.price=price;

    
        res.status(200);
        res.json(theSpot);
    }catch(error){
        res.status(400);
        res.json({
            "message": "Bad Request", 
            "errors": {
              "address": "Street address is required",
              "city": "City is required",
              "state": "State is required",
              "country": "Country is required",
              "lat": "Latitude must be within -90 and 90",
              "lng": "Longitude must be within -180 and 180",
              "name": "Name must be less than 50 characters",
              "description": "Description is required",
              "price": "Price per day must be a positive number"
            }
          })
    }
})

router.delete('/:spotId', async (req, res)=>{
    const {user} = req;
    if(!user){
          res.status(401);
          return res.json({
            "message":"you haven't log in"
          })
    }
    const spotid = req.params.spotId;
    const theSpot = await Spot.findByPk(spotid);
  
    if(theSpot){
        if(theSpot.ownerId !== user.id){
            res.status(403);
            return res.json({
                'message':"it's not your spot"
            })
        }
        await theSpot.destroy();
        res.status(200);
        return res.json({
            "message": "Successfully deleted"
          })
    }
    res.status(404);
    return res.json({
        "message": "Spot couldn't be found"
      })
   
})



module.exports = router;