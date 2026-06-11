package com.acme.spike;

import org.mapstruct.Mapper;
import org.mapstruct.factory.Mappers;

/** MapStruct probe: the processor must generate GreetingMapperImpl on javac 25. */
@Mapper
public interface GreetingMapper {
    GreetingMapper INSTANCE = Mappers.getMapper(GreetingMapper.class);

    GreetingDto toDto(Greeting greeting);
}
